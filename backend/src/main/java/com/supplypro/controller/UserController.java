package com.supplypro.controller;

import com.supplypro.common.ApiResponse;
import com.supplypro.entity.User;
import com.supplypro.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    UserRepository userRepository;

    @GetMapping("/list")
    public ApiResponse<Page<User>> getUsers(
            @RequestParam(required = false, defaultValue = "") String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<User> users;
        
        if (username != null && !username.isEmpty()) {
            users = userRepository.findByUsernameContaining(username, pageable);
        } else {
            users = userRepository.findAll(pageable);
        }
        
        return ApiResponse.success(users);
    }
}
