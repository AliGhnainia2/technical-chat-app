package com.asatech.technicalchat.mapper;

import com.asatech.technicalchat.dto.response.UserResponse;
import com.asatech.technicalchat.model.User;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "id")
    @Mapping(target = "username", source = "username")
    @Mapping(target = "email", source = "email")
    @Mapping(target = "status", source = "status")
    @Mapping(target = "lastSeenAt", source = "lastSeenAt")
    @Mapping(target = "createdAt", source = "createdAt")
    UserResponse toResponse(User user);
}
