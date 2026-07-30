package com.asatech.technicalchat.service;

import com.asatech.technicalchat.dto.request.LoginRequest;
import com.asatech.technicalchat.dto.request.RegisterRequest;
import com.asatech.technicalchat.dto.response.AuthenticationResponse;

public interface AuthService {

    AuthenticationResponse register(RegisterRequest request);

    AuthenticationResponse login(LoginRequest request);
}

