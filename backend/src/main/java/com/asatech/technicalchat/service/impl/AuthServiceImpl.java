package com.asatech.technicalchat.service.impl;

import java.time.Instant;
import java.util.Locale;

import com.asatech.technicalchat.dto.request.LoginRequest;
import com.asatech.technicalchat.dto.request.RegisterRequest;
import com.asatech.technicalchat.dto.response.AuthenticationResponse;
import com.asatech.technicalchat.exception.DuplicateResourceException;
import com.asatech.technicalchat.exception.InvalidCredentialsException;
import com.asatech.technicalchat.exception.RequestValidationException;
import com.asatech.technicalchat.mapper.UserMapper;
import com.asatech.technicalchat.model.User;
import com.asatech.technicalchat.model.UserStatus;
import com.asatech.technicalchat.repository.UserRepository;
import com.asatech.technicalchat.security.JwtService;
import com.asatech.technicalchat.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final String INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserMapper userMapper;

    @Override
    public AuthenticationResponse register(RegisterRequest request) {
        String username = normalizeUsername(request.username());
        String email = normalizeEmail(request.email());

        if (username.length() < 3 || username.length() > 30) {
            throw new RequestValidationException(
                    "username",
                    "Username must contain between 3 and 30 characters"
            );
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("Email is already in use");
        }
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new DuplicateResourceException("Username is already in use");
        }

        Instant now = Instant.now();
        User user = User.builder()
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .status(UserStatus.OFFLINE)
                .lastSeenAt(now)
                .createdAt(now)
                .updatedAt(now)
                .build();

        User savedUser;
        try {
            savedUser = userRepository.save(user);
        } catch (DuplicateKeyException exception) {
            throw new DuplicateResourceException("Email or username is already in use");
        }

        return createAuthenticationResponse(savedUser);
    }

    @Override
    public AuthenticationResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password())
            );
        } catch (AuthenticationException exception) {
            throw new InvalidCredentialsException(INVALID_CREDENTIALS_MESSAGE);
        }

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new InvalidCredentialsException(INVALID_CREDENTIALS_MESSAGE));

        return createAuthenticationResponse(user);
    }

    private AuthenticationResponse createAuthenticationResponse(User user) {
        return new AuthenticationResponse(
                jwtService.generateToken(user),
                "Bearer",
                jwtService.getExpirationSeconds(),
                userMapper.toResponse(user)
        );
    }

    private String normalizeUsername(String username) {
        return username.trim();
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
