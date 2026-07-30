package com.asatech.technicalchat.controller;

import java.util.List;

import com.asatech.technicalchat.dto.response.MessageResponse;
import com.asatech.technicalchat.security.SecurityUser;
import com.asatech.technicalchat.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @GetMapping("/{otherUserId}")
    public ResponseEntity<List<MessageResponse>> getConversation(
            @AuthenticationPrincipal SecurityUser currentUser,
            @PathVariable String otherUserId
    ) {
        return ResponseEntity.ok(
                messageService.getConversation(currentUser.id(), otherUserId)
        );
    }
}
