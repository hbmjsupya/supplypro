package com.supplypro.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("!dev && !local")
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "product.exchange";
    public static final String QUEUE_NAME = "product.es.sync.queue";
    public static final String ROUTING_KEY = "product.es.sync";

    // Snapshot Backfill Config
    public static final String SNAPSHOT_EXCHANGE_NAME = "purchase.order.snapshot.exchange";
    public static final String SNAPSHOT_BACKFILL_QUEUE = "purchase.order.snapshot.backfill.queue";
    public static final String SNAPSHOT_ROUTING_KEY = "purchase.order.snapshot.backfill";
    public static final String SNAPSHOT_DLX_EXCHANGE = "purchase.order.snapshot.dlx.exchange";
    public static final String SNAPSHOT_DLX_QUEUE = "purchase.order.snapshot.dlx.queue";
    public static final String SNAPSHOT_DLX_ROUTING_KEY = "purchase.order.snapshot.dlx";

    // Dead Letter Exchange and Queue for retry
    public static final String DLX_EXCHANGE_NAME = "product.dlx.exchange";
    public static final String DLX_QUEUE_NAME = "product.dlx.queue";
    public static final String DLX_ROUTING_KEY = "product.dlx";

    @Bean
    public DirectExchange productExchange() {
        return new DirectExchange(EXCHANGE_NAME);
    }

    @Bean
    public Queue productEsSyncQueue() {
        return QueueBuilder.durable(QUEUE_NAME)
                .withArgument("x-dead-letter-exchange", DLX_EXCHANGE_NAME)
                .withArgument("x-dead-letter-routing-key", DLX_ROUTING_KEY)
                .build();
    }

    @Bean
    public Binding binding(Queue productEsSyncQueue, DirectExchange productExchange) {
        return BindingBuilder.bind(productEsSyncQueue).to(productExchange).with(ROUTING_KEY);
    }

    // Snapshot Backfill Beans
    @Bean
    public DirectExchange snapshotExchange() {
        return new DirectExchange(SNAPSHOT_EXCHANGE_NAME);
    }

    @Bean
    public Queue snapshotBackfillQueue() {
        return QueueBuilder.durable(SNAPSHOT_BACKFILL_QUEUE)
                .withArgument("x-dead-letter-exchange", SNAPSHOT_DLX_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", SNAPSHOT_DLX_ROUTING_KEY)
                .build();
    }

    @Bean
    public Binding snapshotBinding(Queue snapshotBackfillQueue, DirectExchange snapshotExchange) {
        return BindingBuilder.bind(snapshotBackfillQueue).to(snapshotExchange).with(SNAPSHOT_ROUTING_KEY);
    }
    
    @Bean
    public DirectExchange snapshotDlxExchange() {
        return new DirectExchange(SNAPSHOT_DLX_EXCHANGE);
    }

    @Bean
    public Queue snapshotDlxQueue() {
        return QueueBuilder.durable(SNAPSHOT_DLX_QUEUE).build();
    }

    @Bean
    public Binding snapshotDlxBinding(Queue snapshotDlxQueue, DirectExchange snapshotDlxExchange) {
        return BindingBuilder.bind(snapshotDlxQueue).to(snapshotDlxExchange).with(SNAPSHOT_DLX_ROUTING_KEY);
    }

    // DLX Config
    @Bean
    public DirectExchange dlxExchange() {
        return new DirectExchange(DLX_EXCHANGE_NAME);
    }

    @Bean
    public Queue dlxQueue() {
        return QueueBuilder.durable(DLX_QUEUE_NAME).build();
    }

    @Bean
    public Binding dlxBinding(Queue dlxQueue, DirectExchange dlxExchange) {
        return BindingBuilder.bind(dlxQueue).to(dlxExchange).with(DLX_ROUTING_KEY);
    }
}
