package com.example.system.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "idempotency_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IdempotencyRecord {

    @Id
    @Column(name = "idempotency_key")
    private String key;

    @Column(nullable = false)
    private Integer responseCode;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String responsePayload;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
