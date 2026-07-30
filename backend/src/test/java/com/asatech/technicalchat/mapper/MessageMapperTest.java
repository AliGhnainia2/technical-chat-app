package com.asatech.technicalchat.mapper;

import java.time.Instant;

import com.asatech.technicalchat.dto.response.MessageResponse;
import com.asatech.technicalchat.model.Message;
import com.asatech.technicalchat.model.MessageStatus;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import static org.assertj.core.api.Assertions.assertThat;

class MessageMapperTest {

    private final MessageMapper mapper = Mappers.getMapper(MessageMapper.class);

    @Test
    void shouldMapOnlyMessageResponseFields() {
        Instant sentAt = Instant.parse("2026-07-29T12:00:00Z");
        Message message = Message.builder()
                .id("message-1")
                .senderId("user-1")
                .recipientId("user-2")
                .content("Hello")
                .sentAt(sentAt)
                .status(MessageStatus.SENT)
                .build();

        MessageResponse response = mapper.toResponse(message);

        assertThat(response).isEqualTo(new MessageResponse(
                "message-1",
                "user-1",
                "user-2",
                "Hello",
                sentAt,
                MessageStatus.SENT
        ));
        assertThat(MessageResponse.class.getRecordComponents())
                .extracting(component -> component.getName())
                .containsExactly(
                        "id",
                        "senderId",
                        "recipientId",
                        "content",
                        "sentAt",
                        "status"
                );
    }
}
