package com.asatech.technicalchat.service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import com.asatech.technicalchat.dto.response.PresenceResponse;
import com.asatech.technicalchat.model.User;
import com.asatech.technicalchat.model.UserStatus;
import com.asatech.technicalchat.repository.UserRepository;
import com.asatech.technicalchat.service.impl.PresenceServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PresenceServiceImplTest {

    @Mock
    private UserRepository userRepository;

    private PresenceServiceImpl presenceService;
    private User user;

    @BeforeEach
    void setUp() {
        presenceService = new PresenceServiceImpl(userRepository);
        user = User.builder()
                .id("user-1")
                .username("Alice")
                .email("alice@example.com")
                .status(UserStatus.OFFLINE)
                .lastSeenAt(Instant.parse("2026-07-29T10:00:00Z"))
                .build();
        lenient().when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        lenient().when(userRepository.save(any(User.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void shouldMarkUserOnlineOnConnection() {
        PresenceResponse response = presenceService.userConnected("user-1");

        assertThat(response.status()).isEqualTo(UserStatus.ONLINE);
        assertThat(response.lastSeenAt()).isAfter(Instant.parse("2026-07-29T10:00:00Z"));
    }

    @Test
    void shouldMarkUserOfflineOnLastDisconnection() {
        presenceService.userConnected("user-1");

        PresenceResponse response = presenceService.userDisconnected("user-1");

        assertThat(response.status()).isEqualTo(UserStatus.OFFLINE);
    }

    @Test
    void shouldRemainOnlineWhileAnotherSessionIsActive() {
        presenceService.userConnected("user-1");
        presenceService.userConnected("user-1");

        PresenceResponse response = presenceService.userDisconnected("user-1");

        assertThat(response.status()).isEqualTo(UserStatus.ONLINE);
    }

    @Test
    void shouldResetStaleOnlineUsersAtStartup() {
        User staleUser = User.builder()
                .id("stale-user")
                .status(UserStatus.ONLINE)
                .build();
        when(userRepository.findAllByStatus(UserStatus.ONLINE))
                .thenReturn(List.of(staleUser));

        presenceService.resetAllOffline();

        assertThat(staleUser.getStatus()).isEqualTo(UserStatus.OFFLINE);
        assertThat(staleUser.getLastSeenAt()).isNotNull();
        verify(userRepository).saveAll(List.of(staleUser));
    }
}
