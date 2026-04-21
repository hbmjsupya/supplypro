package com.supplypro.config;

import com.supplypro.service.impl.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.Collections;

@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Autowired
    UserDetailsServiceImpl userDetailsService;

    @Autowired
    private AuthEntryPointJwt unauthorizedHandler;

    @Bean
    public JwtAuthenticationFilter authenticationJwtTokenFilter() {
        return new JwtAuthenticationFilter();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();

        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());

        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors().configurationSource(corsConfigurationSource()).and().csrf().disable()
            .exceptionHandling().authenticationEntryPoint(unauthorizedHandler).and()
            .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS).and()
            .authorizeRequests()
            .antMatchers("/api/auth/**").permitAll()
            .antMatchers("/api/test/**").permitAll()
            .antMatchers("/api/logistics/**").permitAll() // Temporary for debugging
            .antMatchers("/api/logistics-companies/**").permitAll() // Logistics companies for dropdown
            .antMatchers("/api/purchase-orders/logistics-detail/**").permitAll() // Logistics detail for delivery settlement
            .antMatchers("/api/purchase-orders/delivery/checkWaybill").permitAll() // Waybill validation for shipping
            .antMatchers("/api/purchase-orders/*/ship").permitAll() // Purchase order shipping
            .antMatchers("/api/purchase-orders").permitAll() // Purchase order list
            .antMatchers("/api/purchase-orders/*").permitAll() // Purchase order CRUD
            .antMatchers("/api/purchase-orders/*/fix-logistics").permitAll() // Fix logistics info
            .antMatchers("/api/purchase-orders/sync-shipping-status").permitAll() // Sync shipping status
            .antMatchers("/api/purchase-orders/migrate-shipping-status").permitAll() // Migrate shipping status
            .antMatchers("/api/purchase-orders/fix-duplicate-snapshots").permitAll() // Fix duplicate snapshots
            .antMatchers("/api/purchase-orders/restore-from-snapshots").permitAll() // Restore from snapshots
            .antMatchers("/api/purchase-orders/sync-logistics-status").permitAll() // Sync logistics delivery status
            .antMatchers("/api/purchase-orders/clear-all-data").permitAll() // Clear all data
            .antMatchers("/api/purchase-orders/cleanup-orphan-snapshots").permitAll() // Cleanup orphan snapshots
            .antMatchers("/api/purchase-orders/debug/**").permitAll() // Debug APIs
            .antMatchers("/api/purchase-orders/*/force").permitAll() // Force delete purchase order
            .antMatchers("/api/brands/upload-icon").permitAll() // Brand icon upload
            .antMatchers("/api/settlements/pending-delivery").permitAll() // Pending delivery settlements
            .antMatchers("/api/settlements/delivery/**").permitAll() // Delivery order detail
            .antMatchers("/api/settlements/delivery/*/fix-logistics").permitAll() // Fix delivery logistics info
            .antMatchers("/api/settlements").permitAll() // Supplier settlements list
            .antMatchers("/api/settlements/**").permitAll() // Settlements API
            // .antMatchers("/uploads/**").permitAll() // Disable static access to uploads
            // .antMatchers("/api/files/download/**").permitAll()
            // .antMatchers("/api/supplier-files/**").permitAll() // Require auth for file management
            .antMatchers("/api/suppliers/**").permitAll()
            .antMatchers("/api/logistics-companies/**").permitAll()
            .antMatchers("/api/inbound-orders/**").permitAll() // Inbound orders API
            .antMatchers("/api/warehouses/**").permitAll() // Warehouses API
            .antMatchers("/api/inventory/**").permitAll() // Inventory API
            .antMatchers("/api/stock-flows/**").permitAll() // Stock flows API
            .antMatchers("/api/product-categories/**").permitAll()
            .antMatchers("/api/tax-categories/**").permitAll()
            .antMatchers("/api/brands/**").permitAll()
            .antMatchers("/api/products/**").permitAll()
            .antMatchers("/api/delivery-export-records/**").permitAll() // Delivery export records API
            .antMatchers("/api/system/maintenance/reset-purchase-orders").permitAll() // Reset purchase orders API
            .antMatchers("/api/cost-adjustments/reset-by-po-nos").permitAll() // Reset cost adjustments API
            .antMatchers("/api/cost-adjustments/**").permitAll() // Cost adjustments API
            .antMatchers("/api/platform-pending-orders/**").permitAll() // Platform pending orders API
            .antMatchers("/api/outbound-orders/**").permitAll() // Outbound orders API
            .antMatchers("/api/prepayment-approvals/**").permitAll() // Prepayment approvals API
            .antMatchers("/api/refund-orders/**").permitAll() // Refund orders API
            .antMatchers("/api/settlement-orders/**").permitAll() // Settlement orders API
            .antMatchers("/uploads/**").permitAll() // Allow static access to uploaded files
            // Allow Actuator endpoints for monitoring
            .antMatchers("/actuator/**").permitAll()
            // Allow Swagger UI
            .antMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-resources/**").permitAll()
            .anyRequest().authenticated();

        http.authenticationProvider(authenticationProvider());

        http.addFilterBefore(authenticationJwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Collections.singletonList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setExposedHeaders(Arrays.asList("X-Total-Count", "X-Success-Count", "X-Fail-Count", "Content-Disposition"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
