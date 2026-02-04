# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
RUN mkdir -p uploads
COPY pom.xml .
COPY src ./src
RUN mvn clean package -Dmaven.test.skip=true

# Run stage
FROM eclipse-temurin:17-jre
VOLUME /tmp
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
