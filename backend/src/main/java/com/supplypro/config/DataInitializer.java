package com.supplypro.config;

import com.supplypro.entity.Role;
import com.supplypro.entity.User;
import com.supplypro.repository.RoleRepository;
import com.supplypro.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Override
    public void run(String... args) throws Exception {
        // Initialize Roles
        if (roleRepository.findByName(Role.ERole.ROLE_USER).isEmpty()) {
            Role userRole = new Role();
            userRole.setName(Role.ERole.ROLE_USER);
            roleRepository.save(userRole);
        }

        if (roleRepository.findByName(Role.ERole.ROLE_MODERATOR).isEmpty()) {
            Role modRole = new Role();
            modRole.setName(Role.ERole.ROLE_MODERATOR);
            roleRepository.save(modRole);
        }

        if (roleRepository.findByName(Role.ERole.ROLE_ADMIN).isEmpty()) {
            Role adminRole = new Role();
            adminRole.setName(Role.ERole.ROLE_ADMIN);
            roleRepository.save(adminRole);
        }

        if (roleRepository.findByName(Role.ERole.ROLE_FINANCE).isEmpty()) {
            Role financeRole = new Role();
            financeRole.setName(Role.ERole.ROLE_FINANCE);
            roleRepository.save(financeRole);
        }

        // Initialize Default Admin User
        if (!userRepository.existsByUsername("admin")) {
            User user = new User();
            user.setUsername("admin");
            user.setEmail("admin@supplypro.com");
            user.setPassword(encoder.encode("123456"));

            Set<Role> roles = new HashSet<>();
            Role adminRole = roleRepository.findByName(Role.ERole.ROLE_ADMIN)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(adminRole);
            
            Role userRole = roleRepository.findByName(Role.ERole.ROLE_USER)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(userRole);

            user.setRoles(roles);
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
