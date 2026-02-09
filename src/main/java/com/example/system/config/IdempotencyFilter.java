package com.example.system.config;

import com.example.system.model.IdempotencyRecord;
import com.example.system.repository.IdempotencyRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class IdempotencyFilter extends OncePerRequestFilter {

    private final IdempotencyRepository idempotencyRepository;
    private static final String IDEMPOTENCY_HEADER = "X-Idempotency-Key";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String key = request.getHeader(IDEMPOTENCY_HEADER);

        if (key == null || key.isBlank() || !"POST".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        var recordOpt = idempotencyRepository.findById(key);
        if (recordOpt.isPresent()) {
            IdempotencyRecord record = recordOpt.get();
            response.setStatus(record.getResponseCode());
            response.setContentType("application/json");
            response.getWriter().write(record.getResponsePayload());
            response.getWriter().flush();
            return;
        }

        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(response);
        try {
            filterChain.doFilter(request, responseWrapper);

            int status = responseWrapper.getStatus();
            if (status >= 200 && status < 300) {
                byte[] responseArray = responseWrapper.getContentAsByteArray();
                String responseBody = new String(responseArray, responseWrapper.getCharacterEncoding());

                IdempotencyRecord record = IdempotencyRecord.builder()
                        .key(key)
                        .responseCode(status)
                        .responsePayload(responseBody)
                        .build();
                idempotencyRepository.save(record);
            }
            responseWrapper.copyBodyToResponse();
        } catch (Exception e) {
            responseWrapper.copyBodyToResponse();
            throw e;
        }
    }
}
