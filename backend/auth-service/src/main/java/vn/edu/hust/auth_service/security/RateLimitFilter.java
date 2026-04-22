package vn.edu.hust.auth_service.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

import static vn.edu.hust.auth_service.utils.AppConstants.MAX_REQUESTS;
import static vn.edu.hust.auth_service.utils.AppConstants.WINDOW_SECONDS;

@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();

        if (path.startsWith("/api/auth")) {
            String ip = request.getRemoteAddr();
            String key = "rate_limit:" + ip + ":" + path;

            if (!rateLimitService.isAllowed(key, MAX_REQUESTS, WINDOW_SECONDS)) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.getWriter().write("Quá nhiều yêu cầu. Vui lòng thử lại sau.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}

