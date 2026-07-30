package com.asatech.technicalchat.service.impl;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import com.asatech.technicalchat.dto.response.PresenceResponse;
import com.asatech.technicalchat.exception.ResourceNotFoundException;
import com.asatech.technicalchat.model.User;
import com.asatech.technicalchat.model.UserStatus;
import com.asatech.technicalchat.repository.UserRepository;
import com.asatech.technicalchat.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PresenceServiceImpl implements PresenceService {

    private final UserRepository userRepository;
    private final ConcurrentHashMap<String, AtomicInteger> activeSessions =
            new ConcurrentHashMap<>();

    @Override
    public PresenceResponse userConnected(String userId) {
        activeSessions.compute(userId, (id, count) -> {
            if (count == null) {
                return new AtomicInteger(1);
            }
            count.incrementAndGet();
            return count;
        });
        return updatePresence(userId, UserStatus.ONLINE);
    }

    @Override
    public PresenceResponse userDisconnected(String userId) {
        AtomicInteger remainingSessions = activeSessions.computeIfPresent(
                userId,
                (id, count) -> count.decrementAndGet() <= 0 ? null : count
        );
        if (remainingSessions != null) {
            return currentPresence(userId);
        }
        return updatePresence(userId, UserStatus.OFFLINE);
    }

    @Override
    public void resetAllOffline() {
        activeSessions.clear();
        Instant now = Instant.now();
        var onlineUsers = userRepository.findAllByStatus(UserStatus.ONLINE);
        onlineUsers.forEach(user -> {
            user.setStatus(UserStatus.OFFLINE);
            user.setLastSeenAt(now);
            user.setUpdatedAt(now);
        });
        if (!onlineUsers.isEmpty()) {
            userRepository.saveAll(onlineUsers);
        }
    }

    private PresenceResponse updatePresence(String userId, UserStatus status) {
        User user = requireUser(userId);
        Instant now = Instant.now();
        user.setStatus(status);
        user.setLastSeenAt(now);
        user.setUpdatedAt(now);
        User savedUser = userRepository.save(user);
        return toResponse(savedUser);
    }

    private PresenceResponse currentPresence(String userId) {
        return toResponse(requireUser(userId));
    }

    private User requireUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Presence user not found"));
    }

    private PresenceResponse toResponse(User user) {
        return new PresenceResponse(user.getId(), user.getStatus(), user.getLastSeenAt());
    }
}
