package vn.edu.hust.order_service.dto;

import jakarta.validation.constraints.NotBlank;

public record ReturnToHubRequest(
        @NotBlank(message = "hubId không được để trống")
        String hubId
) {
}