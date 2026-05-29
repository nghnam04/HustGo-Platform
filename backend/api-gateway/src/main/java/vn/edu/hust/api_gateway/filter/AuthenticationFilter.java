package vn.edu.hust.api_gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
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
    private final JwtTokenProvider jwtTokenProvider;

    private static final List<String> OPEN_API_ENDPOINTS = List.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/social-login",

            // MOMO CALLBACK
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

            if (request.getMethod().name().equals("OPTIONS")) {
                return chain.filter(exchange);
            }

            String requestPath = request.getURI().getPath();

            boolean isRouteSecured = OPEN_API_ENDPOINTS.stream().noneMatch(requestPath::contains);
            if (!isRouteSecured) {
                return chain.filter(exchange);
            }

            if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                throw new HustGoException(HttpStatus.UNAUTHORIZED, "Authorization Header trống");
            }

            String authHeader = request.getHeaders().get(HttpHeaders.AUTHORIZATION).get(0);
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtTokenProvider.isTokenBlacklisted(token)) {
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

                    // Gắn vào Header
                    ServerHttpRequest mutatedRequest = request.mutate()
                            .header("X-User-Id", username)
                            .header("X-User-Roles", roles)
                            .header(HttpHeaders.AUTHORIZATION, authHeader)
                            .build();

                    return chain.filter(exchange.mutate().request(mutatedRequest).build());
                }
            }
            throw new HustGoException(HttpStatus.UNAUTHORIZED, "Không có quyền truy cập hệ thống");
        };
    }
}