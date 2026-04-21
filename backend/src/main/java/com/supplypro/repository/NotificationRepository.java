package com.supplypro.repository;

import com.supplypro.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUsernameAndIsReadFalseOrderByCreatedAtDesc(String username);
}
