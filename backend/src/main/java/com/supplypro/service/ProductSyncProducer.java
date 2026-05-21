package com.supplypro.service;

import com.supplypro.config.RabbitMQConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class ProductSyncProducer {

    @Autowired(required = false)
    private RabbitTemplate rabbitTemplate;

    public void sendSyncMessage(Long productId) {
        if (rabbitTemplate == null) {
            log.info("RabbitTemplate not available, skipping product sync for ID: {}", productId);
            return;
        }
        try {
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.ROUTING_KEY, productId);
            log.info("Product sync message sent for ID: {}", productId);
        } catch (AmqpException e) {
            log.warn("Failed to send product sync message for ID: {}, error: {}", productId, e.getMessage());
        }
    }
}
