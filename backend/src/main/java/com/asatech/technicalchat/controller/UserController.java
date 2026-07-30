package com.asatech.technicalchat.controller;

import java.util.List;

import com.asatech.technicalchat.dto.response.UserResponse;
import com.asatech.technicalchat.security.SecurityUser;
import com.asatech.technicalchat.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser() {
        return ResponseEntity.ok(userService.getCurrentUser());
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> getUsers(
            @AuthenticationPrincipal SecurityUser currentUser
    ) {
        return ResponseEntity.ok(userService.getUsers(currentUser.id()));
    }
}
