package vn.edu.hust.order_service.dto;

import jakarta.validation.constraints.NotBlank;

public record ArriveAtHubRequest(
        @NotBlank(message = "Mã kho không được để trống")
        String hubId,

        @NotBlank(message = "Phường/Xã đích không được để trống")
        String destinationWard
) {}
