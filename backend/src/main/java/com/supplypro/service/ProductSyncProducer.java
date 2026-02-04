package com.supplypro.service;

import com.supplypro.config.RabbitMQConfig;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ProductSyncProducer {

    @Autowired(required = false)
    private RabbitTemplate rabbitTemplate;

    public void sendSyncMessage(Long productId) {
        if (rabbitTemplate == null) {
            System.out.println("Dev mode: RabbitTemplate not available. Skipping sync message for product " + productId);
            return;
        }
        rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.ROUTING_KEY, productId);
    }
}
