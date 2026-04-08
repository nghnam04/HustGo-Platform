package vn.edu.hust.auth_service.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.auth_service.constant.AuthProvider;
import vn.edu.hust.auth_service.constant.RoleEnum;
import vn.edu.hust.auth_service.dto.AuthResponse;
import vn.edu.hust.auth_service.dto.LoginRequest;
import vn.edu.hust.auth_service.dto.SocialLoginRequest;
import vn.edu.hust.auth_service.entity.Role;
import vn.edu.hust.auth_service.entity.User;
import vn.edu.hust.auth_service.repository.RoleRepository;
import vn.edu.hust.auth_service.repository.UserRepository;
import vn.edu.hust.auth_service.security.JwtTokenProvider;

import java.util.Collections;
import java.util.Date;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtProvider;
    private final AuthenticationManager authenticationManager;
    private final StringRedisTemplate redisTemplate; // Dùng để blacklist token
    private final RoleRepository roleRepository;
    private final org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();

    @Value("${app.google.client-id}")
    private String googleClientId;

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmailOrUsername(request.email(), request.email())
                .orElseThrow(() -> new RuntimeException("Tài khoản hoặc mật khẩu không chính xác"));

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse socialLogin(SocialLoginRequest request) {
        String email;
        String name;
        String picture;
        String providerId;

        if (request.provider() == AuthProvider.GOOGLE) {
            // Logic Google (giữ nguyên của bạn)
            try {
                GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                        new NetHttpTransport(), new GsonFactory())
                        .setAudience(Collections.singletonList(googleClientId))
                        .build();
                GoogleIdToken idToken = verifier.verify(request.token());
                if (idToken == null) throw new RuntimeException("Token Google không hợp lệ");
                GoogleIdToken.Payload payload = idToken.getPayload();
                email = payload.getEmail();
                name = (String) payload.get("name");
                picture = (String) payload.get("picture");
                providerId = payload.getSubject();
            } catch (Exception e) {
                throw new RuntimeException("Xác thực Google thất bại");
            }
        } else if (request.provider() == AuthProvider.FACEBOOK) {
            // Logic FACEBOOK mới
            try {
                String fbUrl = "https://graph.facebook.com/me?fields=id,name,email,picture&access_token=" + request.token();
                var response = restTemplate.getForObject(fbUrl, java.util.Map.class);

                if (response == null || response.get("id") == null) {
                    throw new RuntimeException("Token Facebook không hợp lệ");
                }

                email = (String) response.get("email");
                name = (String) response.get("name");
                providerId = (String) response.get("id");
                // Lấy URL ảnh từ cấu trúc lồng nhau của FB
                var pictureObj = (java.util.Map) response.get("picture");
                var dataObj = (java.util.Map) pictureObj.get("data");
                picture = (String) dataObj.get("url");

            } catch (Exception e) {
                throw new RuntimeException("Xác thực Facebook thất bại");
            }
        } else {
            throw new RuntimeException("Provider không được hỗ trợ");
        }

        // Xử lý lưu/lấy User (Dùng chung cho cả 2)
        User user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    Role customerRole = roleRepository.findByName(RoleEnum.CUSTOMER)
                            .orElseThrow(() -> new RuntimeException("Role CUSTOMER not found"));
                    return userRepository.save(User.builder()
                            .email(email)
                            .fullName(name)
                            .avatarUrl(picture)
                            .provider(request.provider())
                            .providerId(providerId)
                            .roles(Set.of(customerRole))
                            .build());
                });

        return buildAuthResponse(user);
    }

    public void logout(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            String jwt = token.substring(7);
            Date expiration = jwtProvider.extractExpiration(jwt);
            long ttl = expiration.getTime() - System.currentTimeMillis();

            if (ttl > 0) {
                // Lưu vào Redis với prefix blacklist
                redisTemplate.opsForValue().set("blacklist:" + jwt, "true", ttl, TimeUnit.MILLISECONDS);
                log.info("Token blacklisted: {}", jwt);
            }
        }
    }

    @Transactional
    public String register(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email đã tồn tại!");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setProvider(AuthProvider.LOCAL);
        userRepository.save(user);
        return "Đăng ký thành công";
    }

    private AuthResponse buildAuthResponse(User user) {
        // Chuyển đổi sang Authentication
        Authentication auth = new UsernamePasswordAuthenticationToken(
                user.getEmail(),
                null,
                user.getRoles().stream()
                        .map(r -> new SimpleGrantedAuthority("ROLE_" + r.getName().name()))
                        .collect(Collectors.toList())
        );

        // SỬA LỖI STATIC: Gọi qua instance 'jwtProvider'
        String token = jwtProvider.generateToken(auth);

        return new AuthResponse(
                token,
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRoles().stream()
                        .map(r -> r.getName().name())
                        .collect(Collectors.toSet())
        );
    }
}