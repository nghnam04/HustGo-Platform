FROM maven:3.9-eclipse-temurin-17 AS build

ARG SERVICE_NAME=hub-service
WORKDIR /workspace

COPY base-domains/pom.xml base-domains/pom.xml
COPY base-domains/src base-domains/src
RUN mvn -f base-domains/pom.xml -DskipTests install

COPY ${SERVICE_NAME}/pom.xml ${SERVICE_NAME}/pom.xml
RUN mvn -f ${SERVICE_NAME}/pom.xml -DskipTests dependency:go-offline

COPY ${SERVICE_NAME}/src ${SERVICE_NAME}/src
RUN mvn -f ${SERVICE_NAME}/pom.xml -DskipTests package

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app
COPY --from=build /workspace/hub-service/target/*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
