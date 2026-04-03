# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create deterministic non-root runtime identity
RUN addgroup -g 10001 -S appgroup && adduser -u 10001 -S appuser -G appgroup

# Create uploads directory and set permissions
RUN mkdir -p /app/uploads /app/logs \
    && chown -R 10001:10001 /app/uploads /app/logs

# Copy JAR from builder
COPY --from=builder --chown=10001:10001 /app/target/*.jar app.jar

# Switch to non-root user
USER 10001:10001

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
