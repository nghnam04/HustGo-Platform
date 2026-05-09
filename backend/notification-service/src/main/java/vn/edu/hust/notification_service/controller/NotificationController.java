package vn.edu.hust.notification_service.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @GetMapping("/status")
    public String status() {
        return "Notification Service đang chạy và lắng nghe Kafka...";
    }
}