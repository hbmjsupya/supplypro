package com.supplypro.service;

import com.supplypro.config.RabbitMQConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class SnapshotBackfillProducer {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public void sendBackfillRequest(Long purchaseOrderId) {
        log.info("Sending backfill request for PO ID: {}", purchaseOrderId);
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.SNAPSHOT_EXCHANGE_NAME,
                RabbitMQConfig.SNAPSHOT_ROUTING_KEY,
                purchaseOrderId
        );
    }
}
