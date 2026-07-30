package com.asatech.technicalchat.repository;

import java.util.List;
import java.util.Optional;

import com.asatech.technicalchat.model.User;
import com.asatech.technicalchat.model.UserStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    List<User> findAllByIdNotOrderByUsernameAsc(String excludedId);

    List<User> findAllByStatus(UserStatus status);
}
