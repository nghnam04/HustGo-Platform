package vn.edu.hust.api_gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import vn.edu.hust.api_gateway.exception.HustGoException;

import javax.crypto.SecretKey;
import java.util.List;

@Component
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {
    private static final Logger log = LoggerFactory.getLogger(AuthenticationFilter.class);
    private final JwtTokenProvider jwtTokenProvider;

    private static final List<String> PUBLIC_API_ENDPOINTS = List.of(
            // Authentication
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/social-login",

            // Chatbot
            "/api/chatbot/",

            // Momo callback
            "/api/payments/callback"
    );

    public AuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        super(Config.class);
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public static class Config {
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            String requestPath = request.getURI().getPath();
            String method = request.getMethod().name();

            if (method.equals("OPTIONS")) {
                return chain.filter(exchange);
            }

            boolean matchesOpenEndpoint = PUBLIC_API_ENDPOINTS.stream().anyMatch(requestPath::contains);
            if (matchesOpenEndpoint) {
                if (requestPath.contains("/api/chatbot/")) {
                    log.info("[AUTH FILTER] Chatbot endpoint, kiểm tra token để lấy role");
                    if (request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                        log.info("[AUTH FILTER] Chatbot endpoint có token");
                    } else {
                        // Không có token, gán role GUEST mặc định
                        log.info("[AUTH FILTER] Không có token, gán role GUEST");
                        ServerHttpRequest mutatedRequest = request.mutate()
                                .header("X-User-Id", "guest")
                                .header("X-User-Roles", "GUEST")
                                .build();
                        return chain.filter(exchange.mutate().request(mutatedRequest).build());
                    }
                } else {
                    return chain.filter(exchange);
                }
            }

            boolean isPublicOrderTracking = method.equals("GET")
                    && requestPath.matches("/api/orders/[a-f0-9\\-]{36}(/.*)?");
            if (isPublicOrderTracking) {
                log.info("[AUTH FILTER] Public order tracking, cho qua không cần xác thực");
                return chain.filter(exchange);
            }

            boolean isPublicTracking = method.equals("GET")
                    && requestPath.matches("/api/tracking/[a-f0-9\\-]{36}/shipper-location");
            if (isPublicTracking) {
                log.info("[AUTH FILTER] Public endpoint, cho qua không cần xác thực");
                return chain.filter(exchange);
            }

            log.info("[AUTH FILTER] Cần xác thực request, kiểm tra authorization header");
            if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                log.warn("[AUTH FILTER] Không có authorization header, lỗi 401");
                throw new HustGoException(HttpStatus.UNAUTHORIZED, "Authorization Header trống");
            }

            String authHeader = request.getHeaders().get(HttpHeaders.AUTHORIZATION).get(0);
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtTokenProvider.isTokenBlacklisted(token)) {
                    log.warn("[AUTH FILTER] Token trong blacklist, lỗi 401");
                    throw new HustGoException(HttpStatus.UNAUTHORIZED, "Token đã logout hoặc bị thu hồi");
                }

                if (jwtTokenProvider.validateToken(token)) {
                    // Trích xuất claim để lấy Role và Username
                    Claims claims = Jwts.parser()
                            .verifyWith((SecretKey) jwtTokenProvider.key())
                            .build()
                            .parseSignedClaims(token)
                            .getPayload();

                    String username = claims.getSubject();
                    String roles = claims.get("roles", String.class);

                    log.info("[AUTH FILTER] Token xác thực, username={}, adding headers", username);

                    // Gắn vào Header
                    ServerHttpRequest mutatedRequest = request.mutate()
                            .header("X-User-Id", username)
                            .header("X-User-Roles", roles)
                            .header(HttpHeaders.AUTHORIZATION, authHeader)
                            .build();

                    return chain.filter(exchange.mutate().request(mutatedRequest).build());
                } else {
                    log.warn("[AUTH FILTER] Token xác thực thất bại, lỗi 401");
                }
            }
            throw new HustGoException(HttpStatus.UNAUTHORIZED, "Không có quyền truy cập hệ thống");
        };
    }
}