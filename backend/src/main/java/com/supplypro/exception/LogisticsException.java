package com.supplypro.exception;

import org.springframework.http.HttpStatus;

public class LogisticsException extends RuntimeException {
    private final HttpStatus status;

    public LogisticsException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public LogisticsException(String message, Throwable cause, HttpStatus status) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
