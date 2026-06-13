package vn.edu.hust.order_service.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import vn.edu.hust.base_domain.constant.OrderStatus;
import vn.edu.hust.base_domain.dto.FeedbackEvent;
import vn.edu.hust.order_service.dto.FeedbackRequest;
import vn.edu.hust.order_service.dto.FeedbackResponse;
import vn.edu.hust.order_service.entity.Feedback;
import vn.edu.hust.order_service.entity.Order;
import vn.edu.hust.order_service.exception.HustGoException;
import vn.edu.hust.order_service.exception.OrderStatusException;
import vn.edu.hust.order_service.mapper.FeedbackMapper;
import vn.edu.hust.order_service.repository.DeliveryRouteRepository;
import vn.edu.hust.order_service.repository.FeedbackRepository;
import vn.edu.hust.order_service.repository.OrderRepository;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final OrderRepository orderRepository;
    private final DeliveryRouteRepository deliveryRouteRepository;
    private final KafkaTemplate<String, FeedbackEvent> kafkaTemplate;

    // Tạo feedback
    public FeedbackResponse createFeedback(String customerId, FeedbackRequest request) {
        var order = orderRepository.findById(request.orderId())
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng: " + request.orderId()));

        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new OrderStatusException("Chỉ có thể phản hồi đơn hàng đã giao thành công!");
        }

        if (!order.getCustomerId().equals(customerId)) {
            throw new HustGoException(HttpStatus.FORBIDDEN, "Bạn không có quyền phản hồi đơn hàng này!");
        }

        if (feedbackRepository.existsByOrderIdAndCustomerId(request.orderId(), customerId)) {
            throw new HustGoException(HttpStatus.CONFLICT, "Bạn đã phản hồi đơn hàng này rồi!");
        }

        String hubAdminId = order.getRouteId() != null
                ? deliveryRouteRepository.findById(order.getRouteId())
                .map(route -> route.getHubAdminId())
                .orElse(null)
                : null;

        Feedback feedback = Feedback.builder()
                .orderId(request.orderId())
                .customerId(customerId)
                .shipperId(order.getShipperId())
                .routeId(order.getRouteId())
                .hubAdminId(hubAdminId)
                .type(request.type())
                .content(request.content())
                .rating(request.rating())
                .build();

        feedbackRepository.save(feedback);

        log.info("Tạo feedback thành công cho đơn {} - Customer: {}", request.orderId(), customerId);

        sendFeedbackNotifications(feedback, order);

        return FeedbackMapper.mapToResponse(feedback);
    }

    private void sendFeedbackNotifications(Feedback feedback, Order order) {
        String message = buildFeedbackMessage(feedback);

        FeedbackEvent event = new FeedbackEvent(
                "NEW_FEEDBACK",
                feedback.getId(),
                feedback.getOrderId(),
                feedback.getCustomerId(),
                feedback.getShipperId(),
                feedback.getHubAdminId(),
                feedback.getType(),
                feedback.getRating(),
                message,
                null
        );

        try {
            kafkaTemplate.send("feedback-events", event.orderId(), event);
            log.info("Đã gửi FeedbackEvent Kafka cho đơn {}", feedback.getOrderId());
        } catch (Exception e) {
            log.error("Lỗi gửi FeedbackEvent Kafka: {}", e.getMessage());
        }
    }

    private void sendFeedbackUpdatedNotification(Feedback feedback) {
        String message = buildFeedbackUpdatedMessage(feedback);

        FeedbackEvent event = new FeedbackEvent(
                "UPDATED",
                feedback.getId(),
                feedback.getOrderId(),
                feedback.getCustomerId(),
                feedback.getShipperId(),
                feedback.getHubAdminId(),
                feedback.getType(),
                feedback.getRating(),
                message,
                null
        );

        try {
            kafkaTemplate.send("feedback-events", event.orderId(), event);
            log.info("Đã gửi FeedbackEvent UPDATE cho đơn {}", feedback.getOrderId());
        } catch (Exception e) {
            log.error("Lỗi gửi FeedbackEvent UPDATE: {}", e.getMessage());
        }
    }

    private String buildFeedbackMessage(Feedback feedback) {
        String typeMsg = switch (feedback.getType()) {
            case ORDER -> "về đơn hàng";
            case SHIPPER -> "về shipper";
            case SERVICE -> "về dịch vụ";
        };
        return String.format("Khách hàng đã phản hồi %s (đơn %s) - %d sao",
                typeMsg, feedback.getOrderId(), feedback.getRating());
    }

    private String buildFeedbackUpdatedMessage(Feedback feedback) {
        String typeMsg = switch (feedback.getType()) {
            case ORDER -> "về đơn hàng";
            case SHIPPER -> "về shipper";
            case SERVICE -> "về dịch vụ";
        };
        return String.format("Khách hàng đã cập nhật phản hồi %s (đơn %s) - %d sao",
                typeMsg, feedback.getOrderId(), feedback.getRating());
    }

    // Lấy feedback theo customer
    public List<FeedbackResponse> getFeedbacksByCustomer(String customerId) {
        return feedbackRepository.findByCustomerId(customerId).stream()
                .map(FeedbackMapper::mapToResponse)
                .toList();
    }

    // Lấy feedback theo order
    public List<FeedbackResponse> getFeedbacksByOrder(String orderId) {
        return feedbackRepository.findByOrderId(orderId).stream()
                .map(FeedbackMapper::mapToResponse)
                .toList();
    }

    // Lấy tất cả feedback
    public List<FeedbackResponse> getAllFeedbacks() {
        return feedbackRepository.findAll().stream()
                .map(FeedbackMapper::mapToResponse)
                .toList();
    }

    // Xóa mềm feedback khi đơn bị xóa
    public void softDeleteFeedbacksByOrderId(String orderId) {
        List<Feedback> feedbacks = feedbackRepository.findByOrderId(orderId);
        for (Feedback feedback : feedbacks) {
            feedback.setDeletedAt(LocalDateTime.now());
            feedbackRepository.save(feedback);
        }
        log.info("Đã soft-delete {} feedbacks cho order {}", feedbacks.size(), orderId);
    }

    // Xóa mềm feedback hàng loạt khi xóa đơn hàng
    public int softDeleteFeedbacksByOrderIds(List<String> orderIds) {
        if (orderIds == null || orderIds.isEmpty()) return 0;

        int count = 0;
        LocalDateTime now = LocalDateTime.now();
        for (String orderId : orderIds) {
            List<Feedback> feedbacks = feedbackRepository.findByOrderId(orderId);
            for (Feedback feedback : feedbacks) {
                if (feedback.getDeletedAt() == null) { // Chỉ xóa nếu chưa bị xóa
                    feedback.setDeletedAt(now);
                    feedbackRepository.save(feedback);
                    count++;
                }
            }
        }
        log.info("Đã soft-delete {} feedbacks cho {} đơn hàng", count, orderIds.size());
        return count;
    }

    // Xóa vĩnh viễn feedback cũ hơn 6 tháng
    public void cleanupOldFeedbacks() {
        LocalDateTime cutoff = LocalDateTime.now().minusMonths(6);
        List<Feedback> oldFeedbacks = feedbackRepository.findByDeletedAtBefore(cutoff);
        feedbackRepository.deleteAll(oldFeedbacks);
        log.info("Đã xóa {} feedbacks cũ hơn 6 tháng", oldFeedbacks.size());
    }

    // Cập nhật hubAdminId cho feedbacks (gọi từ DeliveryRouteService khi route hoàn thành)
    public void updateHubAdminIdForFeedback(String routeId, String hubAdminId) {
        List<Feedback> feedbacks = feedbackRepository.findByRouteId(routeId);
        for (Feedback feedback : feedbacks) {
            feedback.setHubAdminId(hubAdminId);
            feedbackRepository.save(feedback);
        }
    }

    // Customer cập nhật feedback của mình
    public FeedbackResponse updateFeedback(String feedbackId, String customerId, FeedbackRequest request) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy phản hồi: " + feedbackId));

        if (!feedback.getCustomerId().equals(customerId)) {
            throw new HustGoException(HttpStatus.FORBIDDEN, "Bạn không có quyền cập nhật phản hồi này!");
        }

        feedback.setType(request.type());
        feedback.setContent(request.content());
        feedback.setRating(request.rating());
        feedbackRepository.save(feedback);

        sendFeedbackUpdatedNotification(feedback);

        log.info("Cập nhật feedback {} thành công", feedbackId);
        return FeedbackMapper.mapToResponse(feedback);
    }

    // Xóa feedback
    public void deleteFeedback(String feedbackId, String username, boolean isSuperAdmin) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy phản hồi: " + feedbackId));

        String customerId = feedback.getCustomerId();
        if (!isSuperAdmin && !customerId.equals(username)) {
            throw new HustGoException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa phản hồi này");
        }

        sendFeedbackDeletedNotification(feedback, username, isSuperAdmin);

        feedbackRepository.delete(feedback);
        log.info("Đã xóa feedback {} bởi {} (SuperAdmin: {})", feedbackId, username, isSuperAdmin);
    }

    private void sendFeedbackDeletedNotification(Feedback feedback, String deletedBy, boolean isSuperAdmin) {
        String typeMsg = switch (feedback.getType()) {
            case ORDER -> "về đơn hàng";
            case SHIPPER -> "về shipper";
            case SERVICE -> "về dịch vụ";
        };
        String message = String.format("Phản hồi %s (đơn %s) đã bị xóa",
                typeMsg, feedback.getOrderId());

        FeedbackEvent event = new FeedbackEvent(
                "DELETED",
                feedback.getId(),
                feedback.getOrderId(),
                feedback.getCustomerId(),
                feedback.getShipperId(),
                feedback.getHubAdminId(),
                feedback.getType(),
                feedback.getRating(),
                message,
                deletedBy
        );

        try {
            kafkaTemplate.send("feedback-events", event.orderId(), event);
            log.info("Đã gửi FeedbackEvent DELETED cho đơn {}", feedback.getOrderId());
        } catch (Exception e) {
            log.error("Lỗi gửi FeedbackEvent DELETED: {}", e.getMessage());
        }
    }

    // Lấy feedback theo ID
    public FeedbackResponse getFeedbackById(String feedbackId) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy phản hồi: " + feedbackId));
        return FeedbackMapper.mapToResponse(feedback);
    }
}