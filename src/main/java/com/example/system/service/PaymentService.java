package com.example.system.service;

import com.example.system.exception.BusinessException;
import com.example.system.model.PaymentRequest;
import com.example.system.model.Task;
import com.example.system.model.Transaction;
import com.example.system.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final TransactionRepository transactionRepository;
    private final TaskService taskService;
    private final ExternalPaymentProvider externalPaymentProvider;

    @Transactional
    public Transaction processPayment(PaymentRequest request) {
        log.info("Starting payment process for task: {} with ref: {}", request.getTaskId(),
                request.getExternalReference());

        if (transactionRepository.existsByExternalReference(request.getExternalReference())) {
            throw new BusinessException("Duplicate external reference", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        Task task = taskService.getTaskById(request.getTaskId());

        // Initialize transaction
        Transaction transaction = Transaction.builder()
                .task(task)
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .externalReference(request.getExternalReference())
                .status(Transaction.TransactionStatus.PENDING)
                .type(Transaction.TransactionType.DEBIT)
                .build();

        transaction = transactionRepository.save(transaction);

        // Process with external provider
        Transaction.TransactionStatus resultStatus = externalPaymentProvider
                .processPayment(request.getExternalReference());

        transaction.setStatus(resultStatus);
        transactionRepository.save(transaction);

        if (resultStatus == Transaction.TransactionStatus.SUCCESS) {
            taskService.updateTaskStatus(task.getId(), Task.TaskStatus.COMPLETED);
        } else {
            taskService.updateTaskStatus(task.getId(), Task.TaskStatus.CANCELLED);
        }

        return transaction;
    }
}
