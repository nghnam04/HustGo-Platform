package vn.edu.hust.order_service.mapper;

import vn.edu.hust.order_service.dto.FeedbackResponse;
import vn.edu.hust.order_service.entity.Feedback;

public class FeedbackMapper {

    public static FeedbackResponse mapToResponse(Feedback feedback) {
        if (feedback == null) return null;

        return new FeedbackResponse(
                feedback.getId(),
                feedback.getOrderId(),
                feedback.getCustomerId(),
                feedback.getShipperId(),
                feedback.getRouteId(),
                feedback.getHubAdminId(),
                feedback.getType(),
                feedback.getContent(),
                feedback.getRating(),
                feedback.getCreatedAt()
        );
    }
}