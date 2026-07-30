package com.asatech.technicalchat.service.impl;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

import com.asatech.technicalchat.dto.request.SendMessageRequest;
import com.asatech.technicalchat.dto.response.MessageResponse;
import com.asatech.technicalchat.exception.BusinessException;
import com.asatech.technicalchat.exception.RequestValidationException;
import com.asatech.technicalchat.exception.ResourceNotFoundException;
import com.asatech.technicalchat.mapper.MessageMapper;
import com.asatech.technicalchat.model.Message;
import com.asatech.technicalchat.model.MessageStatus;
import com.asatech.technicalchat.model.User;
import com.asatech.technicalchat.repository.MessageRepository;
import com.asatech.technicalchat.repository.UserRepository;
import com.asatech.technicalchat.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private static final int CONVERSATION_LIMIT = 200;

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final MessageMapper messageMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public List<MessageResponse> getConversation(String currentUserId, String otherUserId) {
        validateDistinctUsers(currentUserId, otherUserId);
        requireUser(currentUserId, "Authenticated user not found");
        requireUser(otherUserId, "Conversation user not found");

        PageRequest latestMessages = PageRequest.of(
                0,
                CONVERSATION_LIMIT,
                Sort.by(
                        Sort.Order.desc("sentAt"),
                        Sort.Order.desc("id")
                )
        );

        return messageRepository.findConversation(currentUserId, otherUserId, latestMessages)
                .stream()
                .sorted(Comparator
                        .comparing(Message::getSentAt)
                        .thenComparing(
                                Message::getId,
                                Comparator.nullsLast(Comparator.naturalOrder())
                        ))
                .map(messageMapper::toResponse)
                .toList();
    }

    @Override
    public MessageResponse sendMessage(String currentUserId, SendMessageRequest request) {
        validateDistinctUsers(currentUserId, request.recipientId());
        User sender = requireUser(currentUserId, "Authenticated user not found");
        User recipient = requireUser(request.recipientId(), "Message recipient not found");
        String content = normalizeContent(request.content());

        Message message = Message.builder()
                .senderId(sender.getId())
                .recipientId(recipient.getId())
                .content(content)
                .sentAt(Instant.now())
                .status(MessageStatus.SENT)
                .build();

        MessageResponse response = messageMapper.toResponse(messageRepository.save(message));
        messagingTemplate.convertAndSendToUser(
                recipient.getEmail(),
                "/queue/messages",
                response
        );
        messagingTemplate.convertAndSendToUser(
                sender.getEmail(),
                "/queue/messages",
                response
        );
        return response;
    }

    private User requireUser(String userId, String message) {
        if (userId == null || userId.isBlank()) {
            throw new RequestValidationException("userId", "User identifier is required");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(message));
    }

    private void validateDistinctUsers(String currentUserId, String otherUserId) {
        if (currentUserId == null || currentUserId.isBlank()
                || otherUserId == null || otherUserId.isBlank()) {
            throw new RequestValidationException("userId", "User identifier is required");
        }
        if (currentUserId.equals(otherUserId)) {
            throw new BusinessException("Messages cannot be sent to the same user");
        }
    }

    private String normalizeContent(String content) {
        String normalizedContent = content == null ? "" : content.trim();
        if (normalizedContent.isEmpty()) {
            throw new RequestValidationException("content", "Message content is required");
        }
        if (normalizedContent.length() > 2000) {
            throw new RequestValidationException(
                    "content",
                    "Message content must not exceed 2000 characters"
            );
        }
        return normalizedContent;
    }
}
