package com.supplypro.monitor;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class SystemMonitor {

    @Autowired
    private MeterRegistry meterRegistry;

    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;

    @Scheduled(fixedRate = 30000) // Check every 30 seconds
    public void checkSystemHealth() {
        checkDatabaseConnections();
        checkCircuitBreakers();
    }

    private void checkDatabaseConnections() {
        try {
            Double active = meterRegistry.get("hikaricp.connections.active").gauge().value();
            Double max = meterRegistry.get("hikaricp.connections.max").gauge().value();
            
            if (active != null && max != null && max > 0) {
                double usage = (active / max) * 100;
                if (usage > 80.0) {
                    log.error("ALERT: Database connection pool usage high: {}% (Active: {}/Max: {})", 
                            String.format("%.2f", usage), active, max);
                } else if (usage > 50.0) {
                    log.warn("WARNING: Database connection pool usage moderate: {}%", String.format("%.2f", usage));
                }
            }
        } catch (Exception e) {
            // Metrics might not be available yet
            log.debug("Could not retrieve DB metrics: {}", e.getMessage());
        }
    }

    private void checkCircuitBreakers() {
        circuitBreakerRegistry.getAllCircuitBreakers().forEach(cb -> {
            CircuitBreaker.State state = cb.getState();
            String name = cb.getName();
            
            if (state == CircuitBreaker.State.OPEN) {
                log.error("ALERT: Circuit Breaker '{}' is OPEN. Requests are being rejected.", name);
            } else if (state == CircuitBreaker.State.HALF_OPEN) {
                log.warn("WARNING: Circuit Breaker '{}' is HALF_OPEN. Probing backend.", name);
            }
            
            // Log metrics if available
            CircuitBreaker.Metrics metrics = cb.getMetrics();
            float failureRate = metrics.getFailureRate();
            if (failureRate > 50.0) {
                 log.warn("WARNING: Circuit Breaker '{}' failure rate high: {}%", name, failureRate);
            }
        });
    }
}
