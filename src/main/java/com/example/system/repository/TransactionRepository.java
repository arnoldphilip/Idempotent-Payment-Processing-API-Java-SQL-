package com.example.system.repository;

import com.example.system.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    boolean existsByExternalReference(String externalReference);
}
