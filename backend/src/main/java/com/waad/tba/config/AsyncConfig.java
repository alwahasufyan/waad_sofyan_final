package com.waad.tba.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Async configuration for background processing.
 * Used for split-phase approval operations (Claims & PreAuthorizations).
 */
@Configuration
public class AsyncConfig {

    /**
     * Task executor for approval processing.
     * Optimized for financial calculations with PESSIMISTIC locks.
     */
    @Bean(name = "approvalTaskExecutor")
    public Executor approvalTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);          // Start with 5 threads
        executor.setMaxPoolSize(10);          // Max 10 concurrent approvals
        executor.setQueueCapacity(50);        // Queue up to 50 pending approvals
        executor.setThreadNamePrefix("approval-async-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }
}
