package com.example.system.service;

import com.example.system.exception.BusinessException;
import com.example.system.model.Task;
import com.example.system.model.TaskRequest;
import com.example.system.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;

    @Transactional
    public Task createTask(TaskRequest request) {
        log.info("Creating task: {}", request.getTitle());
        Task task = Task.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .status(Task.TaskStatus.PENDING)
                .build();
        return taskRepository.save(task);
    }

    @Transactional(readOnly = true)
    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Task getTaskById(UUID id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Task not found", HttpStatus.NOT_FOUND));
    }

    @Transactional
    public Task updateTask(UUID id, TaskRequest request) {
        log.info("Updating task: {}", id);
        Task task = getTaskById(id);
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        // Hibernate handles @Version here during save
        return taskRepository.save(task);
    }

    @Transactional
    public void updateTaskStatus(UUID id, Task.TaskStatus status) {
        log.info("Updating task status: {} to {}", id, status);
        Task task = getTaskById(id);
        task.setStatus(status);
        taskRepository.save(task);
    }
}
