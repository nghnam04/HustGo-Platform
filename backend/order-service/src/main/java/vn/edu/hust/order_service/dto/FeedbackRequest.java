package vn.edu.hust.order_service.dto;

import jakarta.validation.constraints.*;
import vn.edu.hust.base_domain.constant.FeedbackType;

public record FeedbackRequest(

    @NotBlank(message = "Order ID is required")
    String orderId,

    @NotNull(message = "Feedback type is required")
    FeedbackType type,

    @NotBlank(message = "Content is required")
    @Size(min = 10, max = 1000, message = "Content must be between 10 and 1000 characters")
    String content,

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    Integer rating
) {}