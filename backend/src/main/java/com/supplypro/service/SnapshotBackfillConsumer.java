package com.supplypro.service;

import com.supplypro.config.RabbitMQConfig;
import com.rabbitmq.client.Channel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.io.IOException;

@Service
@Slf4j
public class SnapshotBackfillConsumer {

    @Autowired
    private PurchaseOrderSnapshotService snapshotService;

    @RabbitListener(queues = RabbitMQConfig.SNAPSHOT_BACKFILL_QUEUE)
    public void receiveBackfillRequest(Long purchaseOrderId, Channel channel, Message message) throws IOException {
        log.info("Received backfill request for PO ID: {}", purchaseOrderId);
        try {
            snapshotService.backfillSnapshotSync(purchaseOrderId);
            channel.basicAck(message.getMessageProperties().getDeliveryTag(), false);
        } catch (Exception e) {
            log.error("Failed to backfill snapshot for PO ID: {}", purchaseOrderId, e);
            // Throwing exception triggers Spring AMQP retry/DLX
            throw new RuntimeException("Backfill failed", e);
        }
    }
}
