package com.supplypro.service;

import com.supplypro.entity.Notification;
import com.supplypro.repository.NotificationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Transactional
    public void sendNotification(String username, String content) {
        if (username == null || username.isEmpty()) {
            log.warn("Cannot send notification: username is null or empty. Content: {}", content);
            return;
        }

        Notification notification = new Notification();
        notification.setUserId(0L); // Placeholder for now, can be looked up from UserService if needed
        notification.setUsername(username);
        notification.setContent(content);
        notification.setIsRead(false);

        notificationRepository.save(notification);
        log.info("Notification sent to user {}: {}", username, content);
    }
}
