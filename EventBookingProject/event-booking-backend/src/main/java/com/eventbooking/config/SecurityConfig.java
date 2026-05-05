package com.eventbooking.config;

import com.eventbooking.service.UserDetailsServiceImpl;
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
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsServiceImpl userDetailsService;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, UserDetailsServiceImpl userDetailsService) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new org.springframework.security.web.authentication.HttpStatusEntryPoint(
                    org.springframework.http.HttpStatus.UNAUTHORIZED)))
            .authorizeHttpRequests(auth -> auth
                // Public
                .requestMatchers("/error").permitAll()
                .requestMatchers("/ws/**").permitAll()           // WebSocket handshake
                .requestMatchers("/api/auth/**").permitAll()
                // Events: public read, restricted write
                .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()
                .requestMatchers("/api/events/**").hasAnyRole("FACULTY", "ADMIN")
                // Admin-only management
                .requestMatchers("/api/admin/faculty/**").hasRole("ADMIN")
                .requestMatchers("/api/admin/users/**").hasRole("ADMIN")
                // Payments: authenticated users
                .requestMatchers("/api/payments/**").authenticated()
                // Notifications: authenticated users
                .requestMatchers("/api/notifications/**").authenticated()
                // Attendee check-in: faculty/admin/student coordinators
                .requestMatchers("/api/attendees/checkin", "/api/attendees/checkout").hasAnyRole("FACULTY", "ADMIN", "STUDENT")
                .requestMatchers("/api/attendees/*/force-allow").hasAnyRole("FACULTY", "ADMIN")
                .requestMatchers("/api/attendees/**").authenticated()
                // Admin & QR
                .requestMatchers("/api/admin/**").hasAnyRole("FACULTY", "ADMIN")
                .requestMatchers("/api/qr/**").hasAnyRole("FACULTY", "ADMIN", "STUDENT")
                // Bookings: authenticated
                .requestMatchers("/api/bookings/**").authenticated()
                // Default
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:*",
            "https://*.vercel.app",
            "https://*.render.com",
            "https://*.railway.app"
        ));
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
