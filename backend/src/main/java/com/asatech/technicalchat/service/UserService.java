package com.asatech.technicalchat.service;

import java.util.List;

import com.asatech.technicalchat.dto.response.UserResponse;

public interface UserService {

    UserResponse getCurrentUser();

    List<UserResponse> getUsers(String currentUserId);
}
