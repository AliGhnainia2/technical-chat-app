package com.asatech.technicalchat.service.impl;

import java.util.List;

import com.asatech.technicalchat.dto.response.UserResponse;
import com.asatech.technicalchat.exception.InvalidCredentialsException;
import com.asatech.technicalchat.exception.ResourceNotFoundException;
import com.asatech.technicalchat.mapper.UserMapper;
import com.asatech.technicalchat.repository.UserRepository;
import com.asatech.technicalchat.security.SecurityUser;
import com.asatech.technicalchat.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Override
    public UserResponse getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof SecurityUser securityUser)) {
            throw new InvalidCredentialsException("Authentication is required");
        }

        return userRepository.findById(securityUser.id())
                .map(userMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }

    @Override
    public List<UserResponse> getUsers(String currentUserId) {
        if (currentUserId == null || currentUserId.isBlank()) {
            throw new InvalidCredentialsException("Authentication is required");
        }
        if (!userRepository.existsById(currentUserId)) {
            throw new ResourceNotFoundException("Authenticated user not found");
        }
        return userRepository.findAllByIdNotOrderByUsernameAsc(currentUserId)
                .stream()
                .map(userMapper::toResponse)
                .toList();
    }
}
