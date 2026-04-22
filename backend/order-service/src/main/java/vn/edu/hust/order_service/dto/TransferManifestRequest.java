package vn.edu.hust.order_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record TransferManifestRequest(
        @NotBlank(message = "Kho đi không được để trống")
        String fromHubId,

        @NotBlank(message = "Kho đến không được để trống")
        String toHubId,

        @NotEmpty(message = "Danh sách đơn hàng không được trống")
        List<String> orderIds
) {}
