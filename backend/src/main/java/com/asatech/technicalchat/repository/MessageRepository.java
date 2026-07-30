package com.asatech.technicalchat.repository;

import java.util.List;

import com.asatech.technicalchat.model.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface MessageRepository extends MongoRepository<Message, String> {

    @Query("""
            {
              '$or': [
                { 'senderId': ?0, 'recipientId': ?1 },
                { 'senderId': ?1, 'recipientId': ?0 }
              ]
            }
            """)
    List<Message> findConversation(String firstUserId, String secondUserId, Pageable pageable);
}
