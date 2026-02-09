package com.example.system.api;

import com.example.system.model.PaymentRequest;
import com.example.system.model.Transaction;
import com.example.system.service.PaymentService;
import com.example.system.repository.IdempotencyRepository;
import com.example.system.model.IdempotencyRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final IdempotencyRepository idempotencyRepository;

    @PostMapping
    public ResponseEntity<Transaction> processPayment(@RequestBody PaymentRequest request) {
        return new ResponseEntity<>(paymentService.processPayment(request), HttpStatus.OK);
    }

    @GetMapping("/idempotency")
    public ResponseEntity<Iterable<IdempotencyRecord>> getIdempotencyKeys() {
        return ResponseEntity.ok(idempotencyRepository.findAll());
    }
}
