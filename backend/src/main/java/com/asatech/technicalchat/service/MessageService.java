package com.asatech.technicalchat.service;

import java.util.List;

import com.asatech.technicalchat.dto.request.SendMessageRequest;
import com.asatech.technicalchat.dto.response.MessageResponse;

public interface MessageService {

    List<MessageResponse> getConversation(String currentUserId, String otherUserId);

    MessageResponse sendMessage(String currentUserId, SendMessageRequest request);
}
