package com.supplypro.service;

import com.rabbitmq.client.Channel;
import com.supplypro.config.RabbitMQConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
@Slf4j
public class SnapshotDlxConsumer {

    @RabbitListener(queues = RabbitMQConfig.SNAPSHOT_DLX_QUEUE)
    public void receiveDlxMessage(Long purchaseOrderId, Channel channel, Message message) throws IOException {
        log.error("MANUAL INTERVENTION REQUIRED: Snapshot backfill failed after retries for PO ID: {}", purchaseOrderId);
        // Here we could save to a 'failed_jobs' table or send an alert to an admin dashboard.
        // For now, we log it clearly for the operations team.
        try {
            // Acknowledge the message in DLX queue so it doesn't pile up, 
            // assuming we have logged it sufficiently for manual handling.
            channel.basicAck(message.getMessageProperties().getDeliveryTag(), false);
        } catch (Exception e) {
            log.error("Failed to acknowledge DLX message for PO ID: {}", purchaseOrderId, e);
        }
    }
}
