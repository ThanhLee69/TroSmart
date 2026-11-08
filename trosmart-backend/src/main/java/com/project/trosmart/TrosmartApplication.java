package com.project.trosmart;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TrosmartApplication {

	public static void main(String[] args) {
		SpringApplication.run(TrosmartApplication.class, args);
	}

}
