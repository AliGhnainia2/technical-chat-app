package com.asatech.technicalchat.mapper;

import com.asatech.technicalchat.dto.response.MessageResponse;
import com.asatech.technicalchat.model.Message;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface MessageMapper {

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "id")
    @Mapping(target = "senderId", source = "senderId")
    @Mapping(target = "recipientId", source = "recipientId")
    @Mapping(target = "content", source = "content")
    @Mapping(target = "sentAt", source = "sentAt")
    @Mapping(target = "status", source = "status")
    MessageResponse toResponse(Message message);
}
