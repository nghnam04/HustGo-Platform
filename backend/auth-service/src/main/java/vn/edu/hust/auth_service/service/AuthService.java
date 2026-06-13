package vn.edu.hust.auth_service.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import vn.edu.hust.auth_service.constant.AuthProvider;
import vn.edu.hust.auth_service.constant.RoleEnum;
import vn.edu.hust.auth_service.dto.AuthResponse;
import vn.edu.hust.auth_service.dto.LoginRequest;
import vn.edu.hust.auth_service.dto.RegisterRequest;
import vn.edu.hust.auth_service.dto.SocialLoginRequest;
import vn.edu.hust.auth_service.entity.Role;
import vn.edu.hust.auth_service.entity.User;
import vn.edu.hust.auth_service.exception.HustGoException;
import vn.edu.hust.auth_service.kafka.UserProducer;
import vn.edu.hust.auth_service.repository.RoleRepository;
import vn.edu.hust.auth_service.repository.UserRepository;
import vn.edu.hust.auth_service.security.JwtTokenProvider;
import vn.edu.hust.auth_service.security.TokenBlacklistService;
import vn.edu.hust.base_domain.dto.UserEvent;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtProvider;
    private final AuthenticationManager authenticationManager;
    private final TokenBlacklistService tokenBlacklistService;
    private final RoleRepository roleRepository;
    private final WebClient webClient;
    private final UserProducer userProducer;

    @Value("${app.google.client-id}")
    private String googleClientId;

    @Value("${app.facebook.app-id}")
    private String facebookAppId;

    @Value("${app.facebook.app-secret}")
    private String facebookAppSecret;

    public AuthResponse login(LoginRequest request) {
        String identifier = request.emailOrUsername().toLowerCase().trim();

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(identifier, request.password())
        );

        User user = userRepository.findByEmailOrUsername(identifier, identifier)
                .orElseThrow(() -> new HustGoException(HttpStatus.UNAUTHORIZED, "Sai tài khoản hoặc mật khẩu"));

        AuthResponse response = buildAuthResponse(user);

        userProducer.publishUserEvent(new UserEvent(
                user.getId(),
                user.getUsername(),
                "LOGGED_IN",
                user.getId(),
                "Bạn vừa đăng nhập thành công vào hệ thống HustGo",
                LocalDateTime.now()
        ));

        return response;
    }

    @Transactional
    @Retry(name = "auth-service", fallbackMethod = "fallbackSocialLogin")
    @CircuitBreaker(name = "auth-service", fallbackMethod = "fallbackSocialLogin")
    public AuthResponse socialLogin(SocialLoginRequest request) {
        if (request.provider() == AuthProvider.GOOGLE) {
            try {
                Map<?, ?> googleResponse = webClient.get()
                        .uri("https://www.googleapis.com/oauth2/v3/userinfo")
                        .headers(headers -> headers.setBearerAuth(request.token()))
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                if (googleResponse == null || googleResponse.get("sub") == null) {
                    throw new HustGoException(HttpStatus.BAD_GATEWAY, "Không thể lấy thông tin từ tài khoản Google");
                }

                String providerId = (String) googleResponse.get("sub");
                String name = (String) googleResponse.get("name");
                String email = (String) googleResponse.get("email");
                String picture = (String) googleResponse.get("picture");

                log.info("Đăng nhập Google thành công cho email: {}", email);

                User user = processSocialUser(email, name, picture, providerId, request.provider());
                AuthResponse response = buildAuthResponse(user);

                userProducer.publishUserEvent(new UserEvent(
                        user.getId(),
                        user.getUsername(),
                        "LOGGED_IN",
                        user.getId(),
                        "Bạn vừa đăng nhập bằng Google vào hệ thống HUSTGo",
                        LocalDateTime.now()
                ));

                return response;
            } catch (Exception e) {
                log.error("Lỗi xác thực Google API: {}", e.getMessage());
                throw new HustGoException(HttpStatus.BAD_GATEWAY, "Xác thực đối tác Google thất bại");
            }
        } else if (request.provider() == AuthProvider.FACEBOOK) {
            try {
                String appAccessToken = facebookAppId + "|" + facebookAppSecret;
                Map<?, ?> debugResponse = webClient.get()
                        .uri("https://graph.facebook.com/debug_token?input_token={input_token}&access_token={access_token}",
                                request.token(), appAccessToken)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                Map<?, ?> data = (Map<?, ?>) debugResponse.get("data");
                if (data == null || !(boolean) data.get("is_valid") || !facebookAppId.equals(data.get("app_id").toString())) {
                    throw new HustGoException(HttpStatus.BAD_REQUEST, "Token Facebook không hợp lệ hoặc không thuộc ứng dụng này");
                }

                Map<?, ?> fbResponse = webClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .scheme("https")
                                .host("graph.facebook.com")
                                .path("/me")
                                .queryParam("fields", "id,name,email,picture")
                                .queryParam("access_token", request.token())
                                .build())
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                if (fbResponse == null || fbResponse.get("id") == null) {
                    throw new HustGoException(HttpStatus.BAD_GATEWAY, "Không thể lấy thông tin từ Facebook");
                }

                String providerId = (String) fbResponse.get("id");
                String name = (String) fbResponse.get("name");
                String email = fbResponse.get("email") != null ? (String) fbResponse.get("email") : providerId + "@facebook.com";
                String picture = extractFacebookPicture(fbResponse);

                log.info("Đăng nhập Facebook thành công cho App ID: {} (User: {})", facebookAppId, providerId);

                User user = processSocialUser(email, name, picture, providerId, request.provider());
                AuthResponse response = buildAuthResponse(user);

                userProducer.publishUserEvent(new UserEvent(
                        user.getId(),
                        user.getUsername(),
                        "LOGGED_IN",
                        user.getId(),
                        "Bạn vừa đăng nhập bằng Facebook vào hệ thống HUSTGo",
                        LocalDateTime.now()
                ));

                return response;
            } catch (Exception e) {
                log.error("Lỗi xác thực Facebook: {}", e.getMessage());
                throw new HustGoException(HttpStatus.BAD_GATEWAY, "Xác thực Facebook thất bại");
            }
        } else {
            throw new HustGoException(HttpStatus.BAD_REQUEST, "Provider không được hỗ trợ");
        }
    }

    private User processSocialUser(String email, String name, String picture, String providerId, AuthProvider provider) {
        return userRepository.findByEmail(email)
                .orElseGet(() -> {
                    Role customerRole = roleRepository.findByName(RoleEnum.CUSTOMER)
                            .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Role CUSTOMER không tồn tại"));
                    return userRepository.save(User.builder()
                            .email(email)
                            .username(email)
                            .fullName(name)
                            .avatarUrl(picture)
                            .provider(provider)
                            .providerId(providerId)
                            .roles(Set.of(customerRole))
                            .build());
                });
    }

    public void logout(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            String jwt = token.substring(7);
            tokenBlacklistService.blacklistToken(jwt);
            log.info("Đã đăng xuất và gửi token vào blacklist");
        }
    }

    @Transactional
    public String register(RegisterRequest request) {
        String email = request.email().toLowerCase().trim();
        String username = request.username().trim();

        if (userRepository.existsByEmail(email)) throw new HustGoException(HttpStatus.CONFLICT, "Email đã tồn tại");
        if (userRepository.existsByUsername(username))
            throw new HustGoException(HttpStatus.CONFLICT, "Username đã tồn tại");

        if (request.role() == RoleEnum.SUPER_ADMIN || request.role() == RoleEnum.HUB_ADMIN) {
            throw new HustGoException(HttpStatus.FORBIDDEN, "Không được phép đăng ký tài khoản quản trị viên");
        }

        Role role = roleRepository.findByName(request.role())
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Role không tồn tại"));

        User user = User.builder()
                .email(email)
                .username(username)
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .provider(AuthProvider.LOCAL)
                .roles(Set.of(role))
                .build();

        User saved = userRepository.save(user);

        userProducer.publishUserEvent(new UserEvent(
                saved.getId(),
                saved.getUsername(),
                "REGISTERED",
                saved.getId(),
                "Chào mừng " + saved.getFullName() + " đã đăng ký tài khoản HUSTGo thành công!",
                LocalDateTime.now()
        ));

        return "Đăng ký thành công";
    }

    private AuthResponse buildAuthResponse(User user) {
        Authentication auth = new UsernamePasswordAuthenticationToken(
                user.getId(),
                null,
                user.getRoles().stream()
                        .map(r -> new SimpleGrantedAuthority("ROLE_" + r.getName().name()))
                        .collect(Collectors.toList())
        );

        String token = jwtProvider.generateToken(auth);

        return new AuthResponse(
                token,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getRoles().stream()
                        .map(r -> r.getName().name())
                        .collect(Collectors.toSet())
        );
    }

    private String extractFacebookPicture(Map<?, ?> fbResponse) {
        try {
            String facebookId = (String) fbResponse.get("id");
            if (facebookId != null) {
                return "https://graph.facebook.com/" + facebookId + "/picture?type=large";
            }
        } catch (Exception e) {
            log.warn("Không thể trích xuất thông tin ảnh từ Facebook: {}", e.getMessage());
        }
        return null;
    }

    private AuthResponse fallbackSocialLogin(SocialLoginRequest request, Throwable ex) {
        log.error("[AuthService] Fallback socialLogin cho provider {}: {}", request.provider(), ex.getMessage());
        throw new HustGoException(HttpStatus.SERVICE_UNAVAILABLE, "Dịch vụ xác thực " + request.provider() + " tạm thời không khả dụng, vui lòng thử lại sau");
    }
}