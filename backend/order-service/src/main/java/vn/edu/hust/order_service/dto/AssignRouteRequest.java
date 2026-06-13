package vn.edu.hust.order_service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AssignRouteRequest(
        @NotEmpty(message = "Danh sách đơn hàng không được để trống")
        List<String> orderIds
) {
}