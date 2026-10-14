package com.studyflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class StudyFlowApplication {

    /**
     * Starts the StudyFlow Java backend and its idempotent scheduled jobs.
     *
     * @param args optional Spring Boot command-line arguments
     */
    public static void main(String[] args) {
        SpringApplication.run(StudyFlowApplication.class, args);
    }
}
