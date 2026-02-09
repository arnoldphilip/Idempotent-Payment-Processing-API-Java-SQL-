package com.example.system.service;

import com.example.system.exception.BusinessException;
import com.example.system.model.Transaction;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Random;

@Slf4j
@Service
public class ExternalPaymentProvider {

    private final Random random = new Random();

    public Transaction.TransactionStatus processPayment(String externalReference) {
        log.info("Processing external payment for reference: {}", externalReference);

        // Simulate network delay
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Simulate 90% success rate
        if (random.nextDouble() < 0.1) {
            log.error("External payment failed for reference: {}", externalReference);
            return Transaction.TransactionStatus.FAILED;
        }

        log.info("External payment successful for reference: {}", externalReference);
        return Transaction.TransactionStatus.SUCCESS;
    }
}
