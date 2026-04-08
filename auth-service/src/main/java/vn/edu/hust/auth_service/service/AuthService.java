package vn.edu.hust.auth_service.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
import vn.edu.hust.auth_service.repository.RoleRepository;
import vn.edu.hust.auth_service.repository.UserRepository;
import vn.edu.hust.auth_service.security.JwtTokenProvider;
import vn.edu.hust.auth_service.security.TokenBlacklistService;

import java.util.Collections;
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
                .orElseThrow(() -> new RuntimeException("Sai tài khoản hoặc mật khẩu"));

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse socialLogin(SocialLoginRequest request) {
        if (request.provider() == AuthProvider.GOOGLE) {
            try {
                GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                        new NetHttpTransport(), new GsonFactory())
                        .setAudience(Collections.singletonList(googleClientId))
                        .build();
                GoogleIdToken idToken = verifier.verify(request.token());
                if (idToken == null) throw new RuntimeException("Token Google không hợp lệ");

                GoogleIdToken.Payload payload = idToken.getPayload();
                String email = payload.getEmail();
                String name = (String) payload.get("name");
                String picture = (String) payload.get("picture");
                String providerId = payload.getSubject();

                log.info("Đăng nhập Google thành công cho email: {}", email);

                User user = processSocialUser(email, name, picture, providerId, request.provider());
                return buildAuthResponse(user);
            } catch (Exception e) {
                log.error("Lỗi xác thực Google: {}", e.getMessage());
                throw new RuntimeException("Xác thực Google thất bại");
            }
        } else if (request.provider() == AuthProvider.FACEBOOK) {
            try {
                // xác thực bằng acccess token của app
                String appAccessToken = facebookAppId + "|" + facebookAppSecret;
                Map<?, ?> debugResponse = webClient.get()
                        .uri("https://graph.facebook.com/debug_token?input_token={input_token}&access_token={access_token}",
                                request.token(), appAccessToken)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                Map<?, ?> data = (Map<?, ?>) debugResponse.get("data");
                if (data == null || !(boolean) data.get("is_valid") || !facebookAppId.equals(data.get("app_id").toString())) {
                    throw new RuntimeException("Token Facebook không hợp lệ hoặc không thuộc ứng dụng này");
                }

                // lấy thông tin người dùng
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
                    throw new RuntimeException("Không thể lấy thông tin từ Facebook");
                }

                String providerId = (String) fbResponse.get("id");
                String name = (String) fbResponse.get("name");
                String email = fbResponse.get("email") != null ? (String) fbResponse.get("email") : providerId + "@facebook.com";
                String picture = extractFacebookPicture(fbResponse);

                log.info("Đăng nhập Facebook thành công cho App ID: {} (User: {})", facebookAppId, providerId);

                User user = processSocialUser(email, name, picture, providerId, request.provider());
                return buildAuthResponse(user);
            } catch (Exception e) {
                log.error("Lỗi xác thực Facebook: {}", e.getMessage());
                throw new RuntimeException("Xác thực Facebook thất bại");
            }
        } else {
            throw new RuntimeException("Provider không được hỗ trợ");
        }
    }

    private User processSocialUser(String email, String name, String picture, String providerId, AuthProvider provider) {
        return userRepository.findByEmail(email)
                .orElseGet(() -> {
                    Role customerRole = roleRepository.findByName(RoleEnum.CUSTOMER)
                            .orElseThrow(() -> new RuntimeException("Role CUSTOMER không tồn tại"));
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
            log.info("Đã đăng xuất và gửi token vào blacklist.");
        }
    }

    @Transactional
    public String register(RegisterRequest request) {
        String email = request.email().toLowerCase().trim();
        String username = request.username().trim();

        if (userRepository.existsByEmail(email)) throw new RuntimeException("Email đã tồn tại");
        if (userRepository.existsByUsername(username)) throw new RuntimeException("Username đã tồn tại");

        if (request.role() == RoleEnum.SUPER_ADMIN || request.role() == RoleEnum.HUB_ADMIN) {
            throw new RuntimeException("Không được phép đăng ký tài khoản quản trị viên");
        }

        Role role = roleRepository.findByName(request.role())
                .orElseThrow(() -> new RuntimeException("Role không tồn tại"));

        User user = User.builder()
                .email(email)
                .username(username)
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .provider(AuthProvider.LOCAL)
                .roles(Set.of(role))
                .build();

        userRepository.save(user);
        return "Đăng ký thành công";
    }

    private AuthResponse buildAuthResponse(User user) {
        Authentication auth = new UsernamePasswordAuthenticationToken(
                user.getEmail(),
                null,
                user.getRoles().stream()
                        .map(r -> new SimpleGrantedAuthority("ROLE_" + r.getName().name()))
                        .collect(Collectors.toList())
        );

        String token = jwtProvider.generateToken(auth);

        return new AuthResponse(
                token,
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getFullName(),
                user.getRoles().stream()
                        .map(r -> r.getName().name())
                        .collect(Collectors.toSet())
        );
    }

    private String extractFacebookPicture(Map<?, ?> fbResponse) {
        try {
            Map<?, ?> pictureObj = (Map<?, ?>) fbResponse.get("picture");
            if (pictureObj != null) {
                Map<?, ?> dataObj = (Map<?, ?>) pictureObj.get("data");
                if (dataObj != null) {
                    return (String) dataObj.get("url");
                }
            }
        } catch (Exception e) {
            log.warn("Không thể trích xuất thông tin ảnh từ Facebook: {}", e.getMessage());
        }
        return null;
    }
}