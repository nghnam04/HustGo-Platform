package vn.edu.hust.api_gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import javax.crypto.SecretKey;

@Component
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {
    private final JwtTokenProvider jwtTokenProvider;

    public AuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        super(Config.class);
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public static class Config {}

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();

            if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                throw new RuntimeException("Authorization Header trống");
            }

            String authHeader = request.getHeaders().get(HttpHeaders.AUTHORIZATION).get(0);
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
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
            throw new RuntimeException("Không có quyền truy cập");
        };
    }
}