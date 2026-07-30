package com.asatech.technicalchat.service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

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
import com.asatech.technicalchat.service.impl.MessageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageServiceImplTest {

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MessageMapper messageMapper;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private MessageServiceImpl messageService;

    @BeforeEach
    void setUp() {
        messageService = new MessageServiceImpl(
                messageRepository,
                userRepository,
                messageMapper,
                messagingTemplate
        );
        lenient().when(messageMapper.toResponse(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            return new MessageResponse(
                    message.getId(),
                    message.getSenderId(),
                    message.getRecipientId(),
                    message.getContent(),
                    message.getSentAt(),
                    message.getStatus()
            );
        });
    }

    @Test
    void shouldReturnEmptyConversation() {
        configureUsers();
        when(messageRepository.findConversation(
                eq("user-1"),
                eq("user-2"),
                any(Pageable.class)
        )).thenReturn(List.of());

        List<MessageResponse> conversation =
                messageService.getConversation("user-1", "user-2");

        assertThat(conversation).isEmpty();
    }

    @Test
    void shouldReturnBothDirectionsInChronologicalOrder() {
        configureUsers();
        Message latest = message(
                "message-2",
                "user-2",
                "user-1",
                Instant.parse("2026-07-29T12:05:00Z")
        );
        Message earliest = message(
                "message-1",
                "user-1",
                "user-2",
                Instant.parse("2026-07-29T12:00:00Z")
        );
        when(messageRepository.findConversation(
                eq("user-1"),
                eq("user-2"),
                any(Pageable.class)
        )).thenReturn(List.of(latest, earliest));

        List<MessageResponse> conversation =
                messageService.getConversation("user-1", "user-2");

        assertThat(conversation)
                .extracting(MessageResponse::id)
                .containsExactly("message-1", "message-2");
        assertThat(conversation)
                .extracting(MessageResponse::senderId)
                .containsExactly("user-1", "user-2");
    }

    @Test
    void shouldSendTrimmedMessageFromAuthenticatedUser() {
        User sender = user("user-1", "alice@example.com");
        User recipient = user("user-2", "bob@example.com");
        when(userRepository.findById("user-1")).thenReturn(Optional.of(sender));
        when(userRepository.findById("user-2")).thenReturn(Optional.of(recipient));
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            message.setId("message-1");
            return message;
        });

        MessageResponse response = messageService.sendMessage(
                "user-1",
                new SendMessageRequest("user-2", "  Hello Bob  ")
        );

        ArgumentCaptor<Message> messageCaptor = ArgumentCaptor.forClass(Message.class);
        verify(messageRepository).save(messageCaptor.capture());
        Message savedMessage = messageCaptor.getValue();
        assertThat(savedMessage.getSenderId()).isEqualTo("user-1");
        assertThat(savedMessage.getRecipientId()).isEqualTo("user-2");
        assertThat(savedMessage.getContent()).isEqualTo("Hello Bob");
        assertThat(savedMessage.getSentAt()).isNotNull();
        assertThat(savedMessage.getStatus()).isEqualTo(MessageStatus.SENT);
        assertThat(response.id()).isEqualTo("message-1");
        verify(messagingTemplate).convertAndSendToUser(
                "bob@example.com",
                "/queue/messages",
                response
        );
        verify(messagingTemplate).convertAndSendToUser(
                "alice@example.com",
                "/queue/messages",
                response
        );
    }

    @Test
    void shouldRejectBlankMessageAfterNormalization() {
        configureUsers();

        assertThatThrownBy(() -> messageService.sendMessage(
                "user-1",
                new SendMessageRequest("user-2", "   ")
        ))
                .isInstanceOf(RequestValidationException.class)
                .hasMessage("Message content is required");

        verify(messageRepository, never()).save(any());
    }

    @Test
    void shouldRejectMessageLongerThanLimit() {
        configureUsers();

        assertThatThrownBy(() -> messageService.sendMessage(
                "user-1",
                new SendMessageRequest("user-2", "a".repeat(2001))
        ))
                .isInstanceOf(RequestValidationException.class)
                .hasMessage("Message content must not exceed 2000 characters");
    }

    @Test
    void shouldRejectUnknownRecipient() {
        when(userRepository.findById("user-1"))
                .thenReturn(Optional.of(user("user-1", "alice@example.com")));
        when(userRepository.findById("missing-user")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> messageService.sendMessage(
                "user-1",
                new SendMessageRequest("missing-user", "Hello")
        ))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Message recipient not found");
    }

    @Test
    void shouldRejectUnknownAuthenticatedUser() {
        when(userRepository.findById("missing-user")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> messageService.sendMessage(
                "missing-user",
                new SendMessageRequest("user-2", "Hello")
        ))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Authenticated user not found");
    }

    @Test
    void shouldRejectMessageSentToSelf() {
        assertThatThrownBy(() -> messageService.sendMessage(
                "user-1",
                new SendMessageRequest("user-1", "Hello")
        ))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Messages cannot be sent to the same user");

        verify(userRepository, never()).findById(any());
    }

    private void configureUsers() {
        when(userRepository.findById("user-1"))
                .thenReturn(Optional.of(user("user-1", "alice@example.com")));
        when(userRepository.findById("user-2"))
                .thenReturn(Optional.of(user("user-2", "bob@example.com")));
    }

    private static User user(String id, String email) {
        return User.builder()
                .id(id)
                .username(id)
                .email(email)
                .status(com.asatech.technicalchat.model.UserStatus.OFFLINE)
                .build();
    }

    private static Message message(
            String id,
            String senderId,
            String recipientId,
            Instant sentAt
    ) {
        return Message.builder()
                .id(id)
                .senderId(senderId)
                .recipientId(recipientId)
                .content(id)
                .sentAt(sentAt)
                .status(MessageStatus.SENT)
                .build();
    }
}
