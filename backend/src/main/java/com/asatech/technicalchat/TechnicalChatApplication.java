package com.asatech.technicalchat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class TechnicalChatApplication {

    public static void main(String[] args) {
        SpringApplication.run(TechnicalChatApplication.class, args);
    }
}
