package com.asatech.technicalchat.security;

import java.util.Collection;
import java.util.List;

import com.asatech.technicalchat.model.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public final class SecurityUser implements UserDetails {

    private final String id;
    private final String email;
    private final String passwordHash;
    private final String displayUsername;

    public SecurityUser(String id, String email, String passwordHash, String displayUsername) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.displayUsername = displayUsername;
    }

    public static SecurityUser from(User user) {
        return new SecurityUser(
                user.getId(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getUsername()
        );
    }

    public String id() {
        return id;
    }

    public String email() {
        return email;
    }

    public String displayUsername() {
        return displayUsername;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}

