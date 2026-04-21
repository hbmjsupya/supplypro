package com.supplypro.common.filter;

import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RateLimitFilter extends OncePerRequestFilter {

    private RateLimiter rateLimiter;

    @org.springframework.beans.factory.annotation.Value("${supplypro.rate-limit.enabled:true}")
    private boolean enabled;

    @org.springframework.beans.factory.annotation.Value("${supplypro.rate-limit.requests-per-second:100}")
    private int requestsPerSecond;

    @javax.annotation.PostConstruct
    public void init() {
        if (enabled) {
            RateLimiterConfig config = RateLimiterConfig.custom()
                    .timeoutDuration(Duration.ofMillis(0)) // Fail immediately if limit reached
                    .limitRefreshPeriod(Duration.ofSeconds(1))
                    .limitForPeriod(requestsPerSecond)
                    .build();

            RateLimiterRegistry registry = RateLimiterRegistry.of(config);
            this.rateLimiter = registry.rateLimiter("globalRateLimiter");
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        if (!enabled || rateLimiter == null) {
            filterChain.doFilter(request, response);
            return;
        }

        if (rateLimiter.acquirePermission()) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("Too many requests - Rate limit exceeded (" + requestsPerSecond + "/sec)");
        }
    }
}
