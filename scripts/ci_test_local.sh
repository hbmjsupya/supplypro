#!/bin/bash
set -e

# Start dependencies
echo "Starting dependencies..."
docker-compose up -d mysql redis elasticsearch rabbitmq

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
sleep 10

# Run tests in Maven container
echo "Running tests..."
docker run --rm \
  --network supplypro_default \
  -v "$(pwd)/backend":/app \
  -v "$HOME/.m2":/root/.m2 \
  -w /app \
  -e SPRING_DATASOURCE_URL="jdbc:mysql://supplypro-mysql:3306/supplypro?useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true&useUnicode=true&characterEncoding=utf-8" \
  -e SPRING_DATASOURCE_USERNAME=root \
  -e SPRING_DATASOURCE_PASSWORD=password \
  -e SPRING_REDIS_HOST=supplypro-redis \
  -e SPRING_ELASTICSEARCH_URIS=http://supplypro-elasticsearch:9200 \
  -e SPRING_RABBITMQ_HOST=supplypro-rabbitmq \
  maven:3.9.6-eclipse-temurin-17 \
  mvn clean verify -Dmaven.build.cache.enabled=false

echo "Tests completed."
