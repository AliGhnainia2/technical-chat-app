package com.asatech.technicalchat.websocket;

import java.util.Optional;

import com.asatech.technicalchat.model.User;
import com.asatech.technicalchat.repository.UserRepository;
import com.asatech.technicalchat.security.JwtService;
import com.asatech.technicalchat.security.SecurityUser;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.core.Authentication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebSocketAuthInterceptorTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MessageChannel channel;

    @Test
    void shouldRejectInvalidTokenOnConnect() {
        WebSocketAuthInterceptor interceptor =
                new WebSocketAuthInterceptor(jwtService, userRepository);
        when(jwtService.parseToken("invalid-token"))
                .thenThrow(new JwtException("Invalid token"));

        assertThatThrownBy(() -> interceptor.preSend(
                connectMessage("Bearer invalid-token"),
                channel
        ))
                .isInstanceOf(MessagingException.class)
                .hasMessage("WebSocket authentication failed");
    }

    @Test
    void shouldAuthenticateValidTokenWithPersistedUser() {
        WebSocketAuthInterceptor interceptor =
                new WebSocketAuthInterceptor(jwtService, userRepository);
        SecurityUser tokenUser =
                new SecurityUser("user-1", "alice@example.com", "", "Alice");
        User user = User.builder()
                .id("user-1")
                .username("Alice")
                .email("alice@example.com")
                .passwordHash("unused")
                .build();
        when(jwtService.parseToken("valid-token")).thenReturn(tokenUser);
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        Message<byte[]> message = connectMessage("Bearer valid-token");

        interceptor.preSend(message, channel);

        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        assertThat(accessor.getUser()).isInstanceOf(Authentication.class);
        Authentication authentication = (Authentication) accessor.getUser();
        assertThat(authentication.getPrincipal()).isInstanceOf(SecurityUser.class);
        assertThat(((SecurityUser) authentication.getPrincipal()).id())
                .isEqualTo("user-1");
    }

    private static Message<byte[]> connectMessage(String authorization) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader(HttpHeaders.AUTHORIZATION, authorization);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
