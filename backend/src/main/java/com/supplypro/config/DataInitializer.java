package com.supplypro.config;

import com.supplypro.entity.User;
import com.supplypro.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Override
    public void run(String... args) throws Exception {
        // Initialize Default Admin User
        if (!userRepository.existsByUsername("admin")) {
            User user = new User();
            user.setUsername("admin");
            user.setEmail("admin@supplypro.com");
            user.setPassword(encoder.encode("123456"));

            userRepository.save(user);
            System.out.println("Default admin user created: admin / 123456");
        } else {
            // Force reset admin password to 123456 for development convenience
            userRepository.findByUsername("admin").ifPresent(user -> {
                user.setPassword(encoder.encode("123456"));
                userRepository.save(user);
                System.out.println("Admin password reset to: 123456");
            });
        }
    }
}
