package com.supplypro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SupplyProApplication {

    public static void main(String[] args) {
        SpringApplication.run(SupplyProApplication.class, args);
    }

}
