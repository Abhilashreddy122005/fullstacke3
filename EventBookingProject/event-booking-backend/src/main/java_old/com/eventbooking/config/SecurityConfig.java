package com.eventbooking.config;

import com.eventbooking.service.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsServiceImpl userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/api/auth/**").permitAll()
                // Events: read is public
                .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()
                // Event write: FACULTY or ADMIN
                .requestMatchers(HttpMethod.POST, "/api/events").hasAnyRole("FACULTY", "ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/events/**").hasAnyRole("FACULTY", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/events/**").hasAnyRole("FACULTY", "ADMIN")
                // Faculty approval management: ADMIN only
                .requestMatchers("/api/admin/faculty/**").hasRole("ADMIN")
                // Announcements: FACULTY or ADMIN
                .requestMatchers("/api/admin/announcements").hasAnyRole("FACULTY", "ADMIN")
                // Other admin/analytics: FACULTY or ADMIN
                .requestMatchers("/api/admin/**").hasAnyRole("FACULTY", "ADMIN")
                .requestMatchers("/api/qr/**").hasAnyRole("FACULTY", "ADMIN")
                // Event cancel and campaign: FACULTY or ADMIN
                .requestMatchers("/api/events/*/cancel").hasAnyRole("FACULTY", "ADMIN")
                .requestMatchers("/api/events/*/campaign").hasAnyRole("FACULTY", "ADMIN")
                // Bookings: authenticated
                .requestMatchers("/api/bookings/**").authenticated()
                .anyRequest().authenticated()
            )
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("http://localhost:5173", "http://localhost:3000", "http://localhost:*"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setExposedHeaders(List.of("Authorization"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
