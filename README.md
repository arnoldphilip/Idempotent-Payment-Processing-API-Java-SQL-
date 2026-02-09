# Payment & Task API System

A production-grade backend system built with Spring Boot and PostgreSQL, emphasizing correctness, idempotency, and concurrency safety.

## Key Features

- **Idempotency**: Requests with `X-Idempotency-Key` are handled safely, returning cached responses for duplicate requests.
- **Concurrency Safety**: Implements Optimistic Locking using JPA `@Version` to handle concurrent updates to tasks.
- **Transactional Integrity**: Payment processing is wrapped in `@Transactional` to ensure atomicity.
- **Clean Architecture**: Follows a layered architecture (API, Service, Repository, Model).
- **API Documentation**: Integrated Swagger/OpenAPI documentation at `/swagger-ui.html`.

## Tech Stack

- **Java 17**
- **Spring Boot 3.2.2**
- **Spring Data JPA**
- **PostgreSQL**
- **Lombok**
- **SpringDoc OpenAPI (Swagger)**

## API Endpoints

### Tasks
- `POST /api/v1/tasks`: Create a new task.
- `GET /api/v1/tasks`: List all tasks.
- `PUT /api/v1/tasks/{id}`: Update task details (Optimistic Locking).

### Payments
- `POST /api/v1/payments`: Process a payment for a task (Idempotency required via `X-Idempotency-Key` header).

## Getting Started

1.  **Configure Database**: Update `src/main/resources/application.yml` with your PostgreSQL credentials.
2.  **Build**: `mvn clean install`
3.  **Run**: `mvn spring-boot:run`
4.  **Explore**: Open `http://localhost:8080/swagger-ui.html`

## Concurrency Testing

To test optimistic locking, simulate two concurrent `PUT` requests to the same task ID. The second request should return a `409 Conflict` error.

## Idempotency Testing

Send the same `POST` request to `/api/v1/payments` with the same `X-Idempotency-Key` header. The system will process the first request and return the cached response for the second.
