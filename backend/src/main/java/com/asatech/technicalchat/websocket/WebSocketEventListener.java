package com.asatech.technicalchat.websocket;

import java.security.Principal;

import com.asatech.technicalchat.dto.response.PresenceResponse;
import com.asatech.technicalchat.security.SecurityUser;
import com.asatech.technicalchat.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private static final String PRESENCE_DESTINATION = "/topic/presence";

    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void resetStalePresence() {
        presenceService.resetAllOffline();
    }

    @EventListener(SessionConnectedEvent.class)
    public void handleConnected(SessionConnectedEvent event) {
        String userId = extractUserId(event.getUser());
        if (userId != null) {
            publish(presenceService.userConnected(userId));
        }
    }

    @EventListener(SessionDisconnectEvent.class)
    public void handleDisconnected(SessionDisconnectEvent event) {
        String userId = extractUserId(event.getUser());
        if (userId != null) {
            publish(presenceService.userDisconnected(userId));
        }
    }

    private void publish(PresenceResponse presence) {
        messagingTemplate.convertAndSend(PRESENCE_DESTINATION, presence);
    }

    private String extractUserId(Principal principal) {
        if (principal instanceof Authentication authentication
                && authentication.getPrincipal() instanceof SecurityUser securityUser) {
            return securityUser.id();
        }
        return null;
    }
}
