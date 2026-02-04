package com.supplypro.common.aspect;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.Arrays;

@Aspect
@Component
@Slf4j
public class OperationLogAspect {

    @Pointcut("@annotation(com.supplypro.common.annotation.OperationLog)")
    public void logPointCut() {
    }

    @Before("logPointCut()")
    public void saveLog(JoinPoint joinPoint) {
        // Prepare Log Info
        String username = "Anonymous";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            username = auth.getName();
        }

        String methodName = joinPoint.getSignature().getName();
        String className = joinPoint.getTarget().getClass().getSimpleName();
        Object[] args = joinPoint.getArgs();

        log.info("OPERATION LOG: User={}, Method={}.{}, Args={}, Time={}", 
                 username, className, methodName, Arrays.toString(args), LocalDateTime.now());
        
        // In a real system, you would save this to a database table `operation_logs`
        // e.g., operationLogService.save(...);
    }
    
    @AfterReturning(pointcut = "logPointCut()", returning = "result")
    public void doAfterReturning(JoinPoint joinPoint, Object result) {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            log.info("Request Args : {}", Arrays.toString(joinPoint.getArgs()));
            log.info("Response : {}", result);
        }
    }
}
