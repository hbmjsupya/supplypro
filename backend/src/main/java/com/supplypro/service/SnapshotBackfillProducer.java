package com.supplypro.service;

import com.supplypro.config.RabbitMQConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class SnapshotBackfillProducer {

    @Autowired(required = false)
    private RabbitTemplate rabbitTemplate;

    public void sendBackfillRequest(Long purchaseOrderId) {
        if (rabbitTemplate == null) {
            log.info("RabbitTemplate not available, skipping backfill request for PO ID: {}", purchaseOrderId);
            return;
        }
        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.SNAPSHOT_EXCHANGE_NAME,
                    RabbitMQConfig.SNAPSHOT_ROUTING_KEY,
                    purchaseOrderId
            );
            log.info("Backfill request sent for PO ID: {}", purchaseOrderId);
        } catch (AmqpException e) {
            log.warn("Failed to send backfill request for PO ID: {}, error: {}", purchaseOrderId, e.getMessage());
        }
    }
}
