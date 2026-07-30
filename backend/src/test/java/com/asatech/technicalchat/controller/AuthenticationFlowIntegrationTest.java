package com.asatech.technicalchat.controller;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

import com.asatech.technicalchat.model.User;
import com.asatech.technicalchat.model.UserStatus;
import com.asatech.technicalchat.repository.UserRepository;
import com.asatech.technicalchat.repository.MessageRepository;
import com.asatech.technicalchat.security.JwtService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthenticationFlowIntegrationTest {

    private static final String PASSWORD = "StrongPassword123";
    private static final String JWT_SECRET = createTestSecret();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private MessageRepository messageRepository;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("application.security.jwt.secret", () -> JWT_SECRET);
        registry.add("application.security.jwt.expiration-ms", () -> 3_600_000L);
        registry.add("spring.data.mongodb.auto-index-creation", () -> false);
        registry.add(
                "spring.autoconfigure.exclude",
                () -> String.join(",",
                        "org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration",
                        "org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration"
                )
        );
    }

    @Test
    void shouldRegisterUserAndReturnTokenWithoutPasswordHash() throws Exception {
        when(userRepository.existsByEmailIgnoreCase("alice@example.com")).thenReturn(false);
        when(userRepository.existsByUsernameIgnoreCase("Alice")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId("user-1");
            return user;
        });

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "  Alice  ",
                                  "email": "ALICE@EXAMPLE.COM",
                                  "password": "StrongPassword123"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(3600))
                .andExpect(jsonPath("$.user.id").value("user-1"))
                .andExpect(jsonPath("$.user.username").value("Alice"))
                .andExpect(jsonPath("$.user.email").value("alice@example.com"))
                .andExpect(jsonPath("$.user.status").value("OFFLINE"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertThat(savedUser.getPasswordHash()).isNotEqualTo(PASSWORD);
        assertThat(passwordEncoder.matches(PASSWORD, savedUser.getPasswordHash())).isTrue();
        assertThat(savedUser.getCreatedAt()).isNotNull();
        assertThat(savedUser.getUpdatedAt()).isEqualTo(savedUser.getCreatedAt());
    }

    @Test
    void shouldRejectRegistrationWhenEmailAlreadyExists() throws Exception {
        when(userRepository.existsByEmailIgnoreCase("alice@example.com")).thenReturn(true);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRegistrationJson()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email is already in use"));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldRejectRegistrationWhenUsernameAlreadyExists() throws Exception {
        when(userRepository.existsByEmailIgnoreCase("alice@example.com")).thenReturn(false);
        when(userRepository.existsByUsernameIgnoreCase("Alice")).thenReturn(true);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRegistrationJson()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Username is already in use"));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldValidateUsernameAfterNormalization() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "  a  ",
                                  "email": "alice@example.com",
                                  "password": "StrongPassword123"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Request validation failed"))
                .andExpect(jsonPath("$.validationErrors[0].field").value("username"))
                .andExpect(jsonPath("$.validationErrors[0].message")
                        .value("Username must contain between 3 and 30 characters"));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldLoginWithValidCredentials() throws Exception {
        User user = createUser();
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        when(userRepository.findByEmailIgnoreCase("alice@example.com"))
                .thenReturn(Optional.of(user));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "ALICE@EXAMPLE.COM",
                                  "password": "StrongPassword123"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.id").value("user-1"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());
    }

    @Test
    void shouldRejectLoginWithInvalidPasswordWithoutRevealingAccountExistence() throws Exception {
        User user = createUser();
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        when(userRepository.findByEmailIgnoreCase("alice@example.com"))
                .thenReturn(Optional.of(user));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "alice@example.com",
                                  "password": "WrongPassword123"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void shouldRejectCurrentUserEndpointWithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Authentication is required"));
    }

    @Test
    void shouldReturnCurrentUserWithValidToken() throws Exception {
        User user = createUser();
        String token = jwtService.generateToken(user);
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("user-1"))
                .andExpect(jsonPath("$.username").value("Alice"))
                .andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void shouldReturnNotFoundWhenTokenUserNoLongerExists() throws Exception {
        User user = createUser();
        String token = jwtService.generateToken(user);
        when(userRepository.findById("user-1")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Authenticated user not found"));
    }

    @Test
    void shouldRequireTokenForUsersAndMessages() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/messages/user-2"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturnOtherUsersWithoutPasswordHash() throws Exception {
        User currentUser = createUser();
        User otherUser = createUser();
        otherUser.setId("user-2");
        otherUser.setUsername("Bob");
        otherUser.setEmail("bob@example.com");
        String token = jwtService.generateToken(currentUser);
        when(userRepository.existsById("user-1")).thenReturn(true);
        when(userRepository.findAllByIdNotOrderByUsernameAsc("user-1"))
                .thenReturn(java.util.List.of(otherUser));

        mockMvc.perform(get("/api/v1/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("user-2"))
                .andExpect(jsonPath("$[0].username").value("Bob"))
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist());
    }

    private static String validRegistrationJson() {
        return """
                {
                  "username": "Alice",
                  "email": "alice@example.com",
                  "password": "StrongPassword123"
                }
                """;
    }

    private static User createUser() {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        User user = new User();
        user.setId("user-1");
        user.setUsername("Alice");
        user.setEmail("alice@example.com");
        user.setPasswordHash("unused");
        user.setStatus(UserStatus.OFFLINE);
        user.setLastSeenAt(now);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        return user;
    }

    private static String createTestSecret() {
        byte[] key = new byte[32];
        new SecureRandom().nextBytes(key);
        return Base64.getEncoder().encodeToString(key);
    }
}
