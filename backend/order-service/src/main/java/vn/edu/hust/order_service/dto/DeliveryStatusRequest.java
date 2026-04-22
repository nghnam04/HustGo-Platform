package vn.edu.hust.order_service.dto;

import jakarta.validation.constraints.NotNull;
import vn.edu.hust.base_domain.constant.DeliveryResult;

public record DeliveryStatusRequest(
        @NotNull(message = "Kết quả giao hàng không được để trống")
        DeliveryResult result,

        String proofImageUrl, // Ảnh xác nhận (SUCCESS)
        String failReason,     // Lý do (FAILED)
        boolean isMoneyCollected
) {}
