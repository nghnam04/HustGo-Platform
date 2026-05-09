package vn.edu.hust.notification_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class NotificationResponse {
    private String type;    // "PAYMENT", "ORDER"
    private String status;  // "SUCCESS", "FAILED"
    private String message;
    private Object data;
}