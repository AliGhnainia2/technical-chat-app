package com.asatech.technicalchat.service;

import com.asatech.technicalchat.dto.response.PresenceResponse;

public interface PresenceService {

    PresenceResponse userConnected(String userId);

    PresenceResponse userDisconnected(String userId);

    void resetAllOffline();
}
