package com.supplypro.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("!dev")
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "product.exchange";
    public static final String QUEUE_NAME = "product.es.sync.queue";
    public static final String ROUTING_KEY = "product.es.sync";

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
