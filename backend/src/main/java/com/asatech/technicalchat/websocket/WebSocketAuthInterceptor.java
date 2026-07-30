package com.asatech.technicalchat.websocket;

import com.asatech.technicalchat.model.User;
import com.asatech.technicalchat.repository.UserRepository;
import com.asatech.technicalchat.security.JwtService;
import com.asatech.technicalchat.security.SecurityUser;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(
            @NonNull Message<?> message,
            @NonNull MessageChannel channel
    ) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
                message,
                StompHeaderAccessor.class
        );
        if (accessor == null || !StompCommand.CONNECT.equals(accessor.getCommand())) {
            return message;
        }

        String authorization = accessor.getFirstNativeHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
            throw new MessagingException("WebSocket authentication is required");
        }

        try {
            SecurityUser tokenUser = jwtService.parseToken(
                    authorization.substring(BEARER_PREFIX.length())
            );
            User user = userRepository.findById(tokenUser.id())
                    .orElseThrow(() -> new MessagingException(
                            "WebSocket authentication failed"
                    ));
            SecurityUser securityUser = SecurityUser.from(user);
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            securityUser,
                            null,
                            securityUser.getAuthorities()
                    );
            accessor.setUser(authentication);
            return message;
        } catch (JwtException | IllegalArgumentException exception) {
            throw new MessagingException("WebSocket authentication failed");
        }
    }
}
