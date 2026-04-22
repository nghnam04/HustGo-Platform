package vn.edu.hust.auth_service.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private final RedisTemplate<String, String> redisTemplate;
    private final JwtTokenProvider jwtTokenProvider;

    public void blacklistToken(String token) {
        try {
            Date expirationDate = jwtTokenProvider.extractExpiration(token);

            long now = System.currentTimeMillis();
            long ttl = expirationDate.getTime() - now;

            if (ttl > 0) {
                redisTemplate.opsForValue().set(
                        "blacklist:" + token,
                        "true",
                        ttl,
                        TimeUnit.MILLISECONDS
                );
                log.info("Token đã được đưa vào blacklist với TTL: {} ms", ttl);
            }
        } catch (Exception e) {
            log.error("Không thể lưu token vào blacklist: {}", e.getMessage());
        }
    }

    public boolean isTokenBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey("blacklist:" + token));
    }
}
