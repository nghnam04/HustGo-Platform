package vn.edu.hust.hub_service.dto;

import jakarta.validation.constraints.NotBlank;

public record AssignManagerRequest(
        @NotBlank(message = "Manager ID không được để trống")
        String managerId
) {
}