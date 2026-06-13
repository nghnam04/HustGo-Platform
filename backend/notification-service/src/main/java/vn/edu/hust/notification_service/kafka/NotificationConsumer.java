package vn.edu.hust.notification_service.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import vn.edu.hust.base_domain.constant.OrderStatus;
import vn.edu.hust.base_domain.dto.*;
import vn.edu.hust.notification_service.dto.NotificationResponse;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationConsumer {

    private final SimpMessagingTemplate messagingTemplate;

    // ORDER

    @KafkaListener(topics = "${app.kafka.topics.order-events:order-events}", groupId = "notification-group", containerFactory = "orderKafkaListenerContainerFactory")
    public void consumeOrderEvent(OrderStatusChangedEvent event) {
        log.info("Nhận OrderEvent => orderId: {}, {} → {}", event.orderId(), event.oldStatus(), event.newStatus());

        String message = buildOrderMessage(event);

        NotificationResponse response = NotificationResponse.builder()
                .type("ORDER")
                .status(event.newStatus().name())
                .message(message)
                .data(event)
                .build();

        if (event.customerId() != null) {
            messagingTemplate.convertAndSend("/topic/orders/" + event.customerId(), response);
            log.info("Notify customer {}: {}", event.customerId(), message);
        }

        if (event.newStatus() == OrderStatus.AT_HUB && event.routeId() != null && event.hubId() != null) {
            NotificationResponse routeNotice = NotificationResponse.builder()
                    .type("ROUTE_AVAILABLE")
                    .status("NEW_ROUTE")
                    .message("Có tuyến giao hàng mới [" + event.routeId() + "] tại hub " + event.hubId() + ". Vào xem và nhận tuyến!")
                    .data(event)
                    .build();
            messagingTemplate.convertAndSend("/topic/routes/" + event.hubId(), routeNotice);
            log.info("Broadcast tuyến mới {} đến shipper gần hub {}", event.routeId(), event.hubId());
        }

        if (event.shipperId() != null && event.newStatus() != null) {
            switch (event.newStatus()) {
                case PICKING -> {
                    NotificationResponse shipperMsg = NotificationResponse.builder()
                            .type("ORDER")
                            .status("PICKING")
                            .message("Bạn đã nhận tuyến " + event.routeId() + ". Đến hub lấy hàng và bắt đầu giao!")
                            .data(event)
                            .build();
                    messagingTemplate.convertAndSend("/topic/shipper/" + event.shipperId(), shipperMsg);
                    if (event.hubAdminId() != null) {
                        NotificationResponse adminMsg = NotificationResponse.builder()
                                .type("ROUTE_ACCEPTED")
                                .status("ROUTE_ACCEPTED")
                                .message("Shipper đã nhận tuyến " + event.routeId() + ". Tuyến đang được giao.")
                                .data(event)
                                .build();
                        messagingTemplate.convertAndSend("/topic/hub/" + event.hubAdminId(), adminMsg);
                        log.info("Notify hub admin {}: shipper nhận tuyến {}", event.hubAdminId(), event.routeId());
                    }
                }
                case DELIVERING -> {
                    String msg;
                    if (event.failCount() != null && event.failCount() > 0) {
                        msg = "Đơn " + event.orderId() + " giao thất bại lần " + event.failCount() + ". Vui lòng thử lại hoặc trả về hub.";
                    } else {
                        // Lần đầu bắt đầu giao tuyến
                        msg = "Bắt đầu giao tuyến " + event.routeId() + ". Chúc bạn giao hàng suôn sẻ!";
                    }
                    NotificationResponse shipperMsg = NotificationResponse.builder()
                            .type("ORDER")
                            .status("DELIVERING")
                            .message(msg)
                            .data(event).build();
                    messagingTemplate.convertAndSend("/topic/shipper/" + event.shipperId(), shipperMsg);
                }
                case RETURNING -> {
                    NotificationResponse shipperMsg = NotificationResponse.builder()
                            .type("ORDER")
                            .status("RETURNING")
                            .message("Đơn " + event.orderId() + " đã thất bại 2 lần. Vui lòng trả về hub.")
                            .data(event)
                            .build();
                    messagingTemplate.convertAndSend("/topic/shipper/" + event.shipperId(), shipperMsg);
                }
                default -> {
                }
            }
        }

        // Notify Hub Admin
        if (event.hubId() != null) {
            if (event.newStatus() == OrderStatus.AT_HUB && event.oldStatus() != OrderStatus.AT_HUB) {
                NotificationResponse hubMsg = NotificationResponse.builder()
                        .type("ORDER")
                        .status("AT_HUB")
                        .message("Đơn " + event.orderId() + " đã nhập kho. Kiểm tra và phân tuyến giao hàng.")
                        .data(event)
                        .build();
                messagingTemplate.convertAndSend("/topic/hub/" + event.hubId(), hubMsg);
                log.info("Notify hub_admin tại hub {}: đơn {} nhập kho", event.hubId(), event.orderId());
            }
            if (event.newStatus() == OrderStatus.AT_HUB && event.oldStatus() == OrderStatus.AT_HUB && event.hubAdminId() != null) {
                NotificationResponse assignMsg = NotificationResponse.builder()
                        .type("ROUTE_ASSIGNED")
                        .status("ROUTE_ASSIGNED")
                        .message("Đã phân tuyến " + event.routeId() + " thành công. Chờ shipper nhận tuyến.")
                        .data(event)
                        .build();
                messagingTemplate.convertAndSend("/topic/hub/" + event.hubAdminId(), assignMsg);
                log.info("Notify hub_admin {}: phân tuyến {} thành công", event.hubAdminId(), event.routeId());
            }
            if (event.newStatus() == OrderStatus.RETURNING) {
                NotificationResponse hubMsg = NotificationResponse.builder()
                        .type("ORDER")
                        .status("RETURNING")
                        .message("Đơn " + event.orderId() + " thất bại 2 lần đang hoàn về hub.")
                        .data(event).build();
                messagingTemplate.convertAndSend("/topic/hub/" + event.hubId(), hubMsg);
            }
        }

        // Notify Origin hub admin
        if (event.originHubAdminId() != null) {
            if (event.newStatus() == OrderStatus.IN_TRANSIT) {
                NotificationResponse originMsg = NotificationResponse.builder()
                        .type("TRANSFER_CREATED")
                        .status("TRANSFER_CREATED")
                        .message("Chuyến trung chuyển đã tạo cho đơn " + event.orderId() + ". Hàng đang trung chuyển đến hub đích.")
                        .data(event)
                        .build();
                messagingTemplate.convertAndSend("/topic/hubs/" + event.originHubAdminId(), originMsg);
                log.info("Notify origin hub_admin {}: transfer {} đã tạo", event.originHubAdminId(), event.orderId());
            }
            if (event.newStatus() == OrderStatus.AT_HUB && event.oldStatus() == OrderStatus.IN_TRANSIT) {
                NotificationResponse originMsg = NotificationResponse.builder()
                        .type("TRANSFER_RECEIVED")
                        .status("TRANSFER_RECEIVED")
                        .message("Chuyến trung chuyển đã đến đích: đơn " + event.orderId() + " đã nhập kho tại hub đích.")
                        .data(event)
                        .build();
                messagingTemplate.convertAndSend("/topic/hubs/" + event.originHubAdminId(), originMsg);
                log.info("Notify origin hub_admin {}: transfer {} đã đến đích", event.originHubAdminId(), event.orderId());
            }
        }

        // Notify Target Hub admin
        if (event.hubAdminId() != null) {
            if (event.newStatus() == OrderStatus.IN_TRANSIT) {
                NotificationResponse destMsg = NotificationResponse.builder()
                        .type("TRANSFER_INCOMING")
                        .status("TRANSFER_INCOMING")
                        .message("Sắp có hàng trung chuyển đến! Đơn " + event.orderId() + " đang trên đường đến hub của bạn.")
                        .data(event)
                        .build();
                messagingTemplate.convertAndSend("/topic/hubs/" + event.hubAdminId(), destMsg);
                log.info("Notify dest hub_admin {}: có đơn trung chuyển sắp đến", event.hubAdminId());
            }
            if (event.newStatus() == OrderStatus.AT_HUB && event.oldStatus() == OrderStatus.IN_TRANSIT) {
                NotificationResponse destMsg = NotificationResponse.builder()
                        .type("TRANSFER_ARRIVED")
                        .status("TRANSFER_ARRIVED")
                        .message("Có hàng trung chuyển cần xác nhận! Đơn " + event.orderId() + " đang chờ nhập kho tại hub của bạn.")
                        .data(event)
                        .build();
                messagingTemplate.convertAndSend("/topic/hubs/" + event.hubAdminId(), destMsg);
                log.info("Notify dest hub_admin {}: có đơn trung chuyển cần xác nhận", event.hubAdminId());
            }
        }
    }


    private String buildOrderMessage(OrderStatusChangedEvent event) {
        if (event.newStatus() == null) return "Đơn hàng " + event.orderId() + " có cập nhật mới";
        return switch (event.newStatus()) {
            case COLLECTED -> "Đơn hàng " + event.orderId() + " đã được nhận tại bưu cục gửi";
            case IN_TRANSIT -> "Đơn hàng " + event.orderId() + " đang trên đường trung chuyển";
            case AT_HUB -> "Đơn hàng " + event.orderId() + " đã đến bưu cục đích, chuẩn bị giao";
            case PICKING -> "Đơn hàng " + event.orderId() + " đã được shipper nhận tuyến";
            case DELIVERING -> "Đơn hàng " + event.orderId() + " đang được giao đến bạn";
            case COMPLETED -> "Đơn hàng " + event.orderId() + " đã giao thành công. Cảm ơn bạn!";
            case RETURNING -> "Đơn hàng " + event.orderId() + " giao thất bại và đang được hoàn về";
            case CANCELLED -> "Đơn hàng " + event.orderId() + " đã bị hủy";
            default -> "Đơn hàng " + event.orderId() + " hiện đang: " + event.newStatus();
        };
    }

    // PAYMENT

    @KafkaListener(topics = "${app.kafka.topics.payment-events:payment-events}", groupId = "notification-group", containerFactory = "paymentKafkaListenerContainerFactory")
    public void consumePayment(PaymentEvent event) {
        log.info("Nhận sự kiện thanh toán => OrderId: {}, Status: {}, Customer: {}",
                event.orderId(), event.status(), event.customerId());

        String statusMsg = "SUCCESS".equalsIgnoreCase(event.status()) ? "thành công" : "thất bại";

        NotificationResponse response = NotificationResponse.builder()
                .type("PAYMENT")
                .status(event.status())
                .message(String.format("Thanh toán cho đơn hàng %s đã %s.", event.orderId(), statusMsg))
                .data(event)
                .build();

        if (event.customerId() != null) {
            messagingTemplate.convertAndSend("/topic/payments/" + event.customerId(), response);
            log.info("Đã đẩy thông báo WebSocket tới /topic/payments/{}", event.customerId());
        } else {
            log.warn("Không tìm thấy customerId trong PaymentEvent, không thể gửi WebSocket!");
        }
    }

    // HUB
    @KafkaListener(topics = "${app.kafka.topics.hub-events:hub-events}", groupId = "notification-group", containerFactory = "hubKafkaListenerContainerFactory")
    public void consumeHubEvent(HubEvent event) {
        log.info("Nhận sự kiện Hub => hubId: {}, action: {}, actor: {}",
                event.hubId(), event.action(), event.actorId());

        String message = buildHubMessage(event);

        NotificationResponse response = NotificationResponse.builder()
                .type("HUB")
                .status(event.action())
                .message(message)
                .data(event)
                .build();

        if (event.actorId() != null) {
            messagingTemplate.convertAndSend("/topic/hubs/" + event.actorId(), response);
            log.info("Đã đẩy thông báo WebSocket tới /topic/hubs/{}", event.actorId());
        } else {
            log.warn("Không tìm thấy actorId trong HubEvent, không thể gửi WebSocket!");
        }
    }

    // USER
    @KafkaListener(topics = "${app.kafka.topics.user-events:user-events}", groupId = "notification-group", containerFactory = "userKafkaListenerContainerFactory")
    public void consumeUserEvent(UserEvent event) {

        log.info("Nhận UserEvent => userId: {}, action: {}", event.userId(), event.action());

        NotificationResponse response = NotificationResponse.builder()
                .type("USER")
                .status(event.action())
                .message(event.message())
                .data(event)
                .build();

        if (event.userId() != null) {
            messagingTemplate.convertAndSend("/topic/users/" + event.userId(), response);
            log.info("Đã đẩy WebSocket tới /topic/users/{}", event.userId());
        } else {
            log.warn("UserEvent không có userId, không thể gửi WebSocket");
        }
    }

    // ROUTE COMPLETED

    @KafkaListener(topics = "${app.kafka.topics.route-events:route-events}", groupId = "notification-group", containerFactory = "orderKafkaListenerContainerFactory")
    public void consumeRouteCompletedEvent(RouteCompletedEvent event) {
        log.info("Nhận RouteCompletedEvent => routeId: {}, shipper: {}, completed: {}, returned: {}",
                event.routeId(), event.shipperId(), event.completedOrders(), event.returnedOrders());

        // Notify SHIPPER
        if (event.shipperId() != null) {
            String shipperMsg = String.format("Tuyến %s thành công! %d đơn thành công, %d đơn hoàn.", event.routeId(), event.completedOrders(), event.returnedOrders());
            NotificationResponse shipperNotif = NotificationResponse.builder()
                    .type("ROUTE_COMPLETED")
                    .status("COMPLETED")
                    .message(shipperMsg)
                    .data(event)
                    .build();
            messagingTemplate.convertAndSend("/topic/shipper/" + event.shipperId(), shipperNotif);
            log.info("Notify shipper {}: tuyến {} hoàn thành", event.shipperId(), event.routeId());
        }

        // Notify Hub Admin
        if (event.hubAdminId() != null) {
            String adminMsg = String.format("Tuyến %s đã hoàn thành! %d đơn thành công, %d đơn hoàn.", event.routeId(), event.completedOrders(), event.returnedOrders());
            NotificationResponse adminNotif = NotificationResponse.builder()
                    .type("ROUTE_COMPLETED")
                    .status("COMPLETED")
                    .message(adminMsg)
                    .data(event)
                    .build();
            messagingTemplate.convertAndSend("/topic/hub/" + event.hubAdminId(), adminNotif);
            log.info("Notify hub admin {}: tuyến {} hoàn thành", event.hubAdminId(), event.routeId());
        }
    }

    // FEEDBACK
    @KafkaListener(topics = "${app.kafka.topics.feedback-events:feedback-events}", groupId = "notification-group", containerFactory = "feedbackKafkaListenerContainerFactory")
    public void consumeFeedbackEvent(FeedbackEvent event) {
        log.info("Nhận FeedbackEvent => action: {}, orderId: {}, type: {}, rating: {}",
                event.action(), event.orderId(), event.feedbackType(), event.rating());

        String action = event.action();

        // Notify CUSTOMER
        if (event.customerId() != null) {
            String customerMsg;
            String status;
            if ("DELETED".equals(action)) {
                customerMsg = "Phản hồi của bạn đã bị xóa khỏi hệ thống.";
                status = "DELETED";
            } else if ("UPDATED".equals(action)) {
                customerMsg = "Phản hồi của bạn đã được cập nhật.";
                status = "UPDATED";
            } else {
                customerMsg = "Cảm ơn bạn đã phản hồi! Phản hồi của bạn giúp chúng tôi cải thiện dịch vụ tốt hơn.";
                status = "CREATED";
            }

            NotificationResponse customerNotif = NotificationResponse.builder()
                    .type("FEEDBACK")
                    .status(status)
                    .message(customerMsg)
                    .data(event)
                    .build();
            messagingTemplate.convertAndSend("/topic/orders/" + event.customerId(), customerNotif);
            log.info("Notify customer {}: feedback {} ({})", event.customerId(), action, status);
        }

        // Notify SHIPPER
        if (event.shipperId() != null) {
            String shipperMsg;
            String status;
            if ("DELETED".equals(action)) {
                shipperMsg = String.format("Một phản hồi về đơn hàng %s đã bị xóa", event.orderId());
                status = "DELETED";
            } else {
                String typeMsg = switch (event.feedbackType()) {
                    case ORDER -> "về đơn hàng";
                    case SHIPPER -> "về bạn";
                    case SERVICE -> "về dịch vụ";
                    default -> "";
                };
                if ("UPDATED".equals(action)) {
                    shipperMsg = String.format("Khách hàng đã cập nhật phản hồi %s (đơn %s) - %d sao", typeMsg, event.orderId(), event.rating());
                } else {
                    shipperMsg = String.format("Khách hàng đã phản hồi %s (đơn %s) - %d sao", typeMsg, event.orderId(), event.rating());
                }
                status = "UPDATED".equals(action) ? "UPDATED" : "NEW_FEEDBACK";
            }

            NotificationResponse shipperNotif = NotificationResponse.builder()
                    .type("FEEDBACK")
                    .status(status)
                    .message(shipperMsg)
                    .data(event)
                    .build();
            messagingTemplate.convertAndSend("/topic/shipper/" + event.shipperId(), shipperNotif);
            log.info("Notify shipper {}: feedback {} ({})", event.shipperId(), action, status);
        }

        // Notify Hub Admin
        if (event.hubAdminId() != null) {
            String adminMsg;
            String status;
            if ("DELETED".equals(action)) {
                adminMsg = String.format("Phản hồi cho đơn %s đã bị xóa khỏi hệ thống", event.orderId());
                status = "DELETED";
            } else if ("UPDATED".equals(action)) {
                adminMsg = String.format("Khách hàng đã cập nhật phản hồi cho đơn %s - %d sao", event.orderId(), event.rating());
                status = "UPDATED";
            } else {
                adminMsg = String.format("Có phản hồi mới cho đơn %s (đơn %s) - %d sao", event.feedbackType(), event.orderId(), event.rating());
                status = "NEW_FEEDBACK";
            }

            NotificationResponse adminNotif = NotificationResponse.builder()
                    .type("FEEDBACK")
                    .status(status)
                    .message(adminMsg)
                    .data(event)
                    .build();
            messagingTemplate.convertAndSend("/topic/hub/" + event.hubAdminId(), adminNotif);
            log.info("Notify hub admin {}: feedback {} ({})", event.hubAdminId(), action, status);
        }

        // Notify Super Admin
        if ("DELETED".equals(action) && event.deletedBy() != null) {
            String superAdminMsg = String.format("Bạn đã xóa phản hồi của khách hàng cho đơn %s", event.orderId());
            NotificationResponse superAdminNotif = NotificationResponse.builder()
                    .type("FEEDBACK")
                    .status("DELETED_BY_ADMIN")
                    .message(superAdminMsg)
                    .data(event)
                    .build();
            messagingTemplate.convertAndSend("/topic/users/" + event.deletedBy(), superAdminNotif);
            log.info("Notify super admin {}: feedback deleted confirmation", event.deletedBy());
        }
    }

    private String buildHubMessage(HubEvent event) {
        String hubInfo = event.hubName() + " (" + event.hubCode() + ")";
        return switch (event.action()) {
            case "CREATED" -> "Hub " + hubInfo + " đã được tạo thành công";
            case "UPDATED" -> "Hub " + hubInfo + " đã được cập nhật";
            case "DELETED" -> "Hub " + hubInfo + " đã bị vô hiệu hóa";
            case "MANAGER_ASSIGNED" -> "Hub " + hubInfo + " đã được gán quản lý mới";
            default -> "Hub " + hubInfo + " có cập nhật mới: " + event.action();
        };
    }
}