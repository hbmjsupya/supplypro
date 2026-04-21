# syntax=docker/dockerfile:1
# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy settings for mirror configuration
COPY settings.xml /usr/share/maven/conf/settings.xml

# Copy pom.xml and .mvn
COPY pom.xml .
COPY .mvn ./.mvn

# Download dependencies with cache mount
# using -B for batch mode (less logs)
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B dependency:go-offline

# Copy source
COPY src ./src

# Build with cache mount
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B clean package -Dmaven.test.skip=true

# Extract layers for layered jar optimization
RUN java -Djarmode=layertools -jar target/*.jar extract

# Run stage
FROM bellsoft/liberica-runtime-container:jre-17-musl
WORKDIR /app
VOLUME /tmp

# Install font libraries (cached apk)
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache fontconfig ttf-dejavu

# Copy layers explicitly for better caching
COPY --from=build /app/dependencies/ ./
COPY --from=build /app/spring-boot-loader/ ./
COPY --from=build /app/snapshot-dependencies/ ./
COPY --from=build /app/application/ ./

ENTRYPOINT ["java", "org.springframework.boot.loader.JarLauncher"]
