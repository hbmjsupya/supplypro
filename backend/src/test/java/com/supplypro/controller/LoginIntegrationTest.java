package com.supplypro.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.supplypro.entity.User;
import com.supplypro.payload.request.LoginRequest;
import com.supplypro.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class LoginIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    public void testLoginSuccess() throws Exception {
        // Setup User
        User user = new User();
        user.setId(1L);
        user.setUsername("validUser");
        user.setPassword(passwordEncoder.encode("password123"));
        user.setEmail("test@test.com");
        
        Mockito.when(userRepository.findByUsername("validUser")).thenReturn(Optional.of(user));

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("validUser");
        loginRequest.setPassword("password123");

        mockMvc.perform(post("/api/auth/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").exists());
    }

    @Test
    public void testLoginFailure_BadCredentials() throws Exception {
        User user = new User();
        user.setUsername("validUser");
        user.setPassword(passwordEncoder.encode("password123"));
        
        Mockito.when(userRepository.findByUsername("validUser")).thenReturn(Optional.of(user));

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("validUser");
        loginRequest.setPassword("wrongPassword");

        mockMvc.perform(post("/api/auth/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andDo(print())
                .andExpect(status().isUnauthorized()) // 401
                .andExpect(jsonPath("$.message").value("用户名或密码错误"));
    }

    @Test
    public void testLoginFailure_DatabaseError() throws Exception {
        Mockito.when(userRepository.findByUsername("dbErrorUser"))
                .thenThrow(new QueryTimeoutException("DB Timeout"));

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("dbErrorUser");
        loginRequest.setPassword("password123");

        mockMvc.perform(post("/api/auth/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andDo(print())
                .andExpect(status().isServiceUnavailable()) // 503
                .andExpect(jsonPath("$.message").value("数据库连接异常，请稍后重试"));
    }
}
