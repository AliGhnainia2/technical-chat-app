package com.asatech.technicalchat.model;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "messages")
@CompoundIndexes({
        @CompoundIndex(
                name = "conversation_history_idx",
                def = "{'senderId': 1, 'recipientId': 1, 'sentAt': -1, '_id': -1}"
        )
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    private String id;

    @Indexed
    private String senderId;

    @Indexed
    private String recipientId;

    private String content;

    @Indexed
    private Instant sentAt;

    private MessageStatus status;
}
