package vn.edu.hust.chatbot_service.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class ChatBotService {

    private final ChatClient chatClient;
    private final WebClient.Builder webClientBuilder;

    @Value("${orders.service-url:http://order-service/api/orders}")
    private String ORDER_SERVICE_URL;

    @Value("${feedbacks.service-url:http://order-service/api/feedbacks}")
    private String FEEDBACK_SERVICE_URL;

    @Value("${hubs.internal-url:http://hub-service/api/internal/hubs}")
    private String HUB_INTERNAL_URL;

    @Value("${hubs.service-url:http://hub-service/api/hubs}")
    private String HUB_SERVICE_URL;

    @Value("${hubs.admin-url:http://hub-service/api/super-admin/hubs}")
    private String HUB_ADMIN_URL;

    @Value("${auth.service-url:http://auth-service/api/users}")
    private String AUTH_SERVICE_URL;

    public ChatBotService(ChatClient chatClient, WebClient.Builder webClientBuilder) {
        this.chatClient = chatClient;
        this.webClientBuilder = webClientBuilder;
    }

    @CircuitBreaker(name = "chatbot-service", fallbackMethod = "aiFallback")
    @Retry(name = "chatbot-service")
    public String getResponse(String question, String userRole, String userId) {
        List<String> cleanRoles = normalizeRoles(userRole);
        String roleStr = String.join(",", cleanRoles);
        String fullName = fetchFullName(userId, roleStr);
        String liveData = fetchLiveData(question, cleanRoles, userId);
        String prompt = buildPrompt(question, cleanRoles, fullName != null ? fullName : "Khách", liveData);

        return chatClient.prompt()
                .user(prompt)
                .call()
                .content();
    }

    public String aiFallback(String question, String userRole, String userId, Throwable t) {
        log.error("AI Chat error (fallback)", t);
        return "Trợ lý HustGo tạm thời không khả dụng. Vui lòng thử lại sau giây lát!";
    }

    // Normalize role string
    private List<String> normalizeRoles(String roles) {
        if (roles == null || roles.isBlank()) return List.of("GUEST");
        return Arrays.stream(roles.split(","))
                .map(r -> r.replace("ROLE_", "").trim().toUpperCase())
                .filter(r -> !r.isEmpty())
                .toList();
    }

    // Lấy tên đầy đủ từ auth-service
    private String fetchFullName(String userId, String roles) {
        if (userId == null || userId.isBlank()) return null;
        try {
            Map<String, Object> profile = webClientBuilder.build().get()
                    .uri(AUTH_SERVICE_URL + "/me")
                    .header("X-User-Id", userId)
                    .header("X-User-Roles", roles)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .block(Duration.ofSeconds(2));
            if (profile != null) {
                Object name = profile.get("fullName");
                if (name != null) return name.toString();
            }
        } catch (Exception e) {
            log.warn("Could not fetch user profile for {}: {}", userId, e.getMessage());
        }
        return null;
    }

    // Lấy dữ liệu từ các microservices khác
    private String fetchLiveData(String question, List<String> roles, String userId) {
        if (userId == null || (roles.size() == 1 && roles.contains("GUEST"))) return "";
        String msg = question.toLowerCase();
        StringBuilder sb = new StringBuilder();
        try {
            if (roles.contains("CUSTOMER")) sb.append(customerData(userId, msg));
            if (roles.contains("SHIPPER")) sb.append(shipperData(userId, msg));
            if (roles.contains("HUB_ADMIN")) sb.append(hubAdminData(userId, msg));
            if (roles.contains("SUPER_ADMIN") || roles.contains("ADMIN")) sb.append(adminData(userId, msg));
        } catch (Exception e) {
            log.warn("Live data fetch error for roles {}: {}", roles, e.getMessage());
        }
        return sb.toString();
    }

    // CUSTOMER
    private String customerData(String userId, String msg) {
        StringBuilder sb = new StringBuilder();

        // Tất cả đơn hàng
        try {
            Map<String, Object> res = webClientBuilder.build().get()
                    .uri(ORDER_SERVICE_URL + "/my-orders?size=500&sort=createdAt,desc")
                    .header("X-User-Id", userId).header("X-User-Roles", "CUSTOMER")
                    .retrieve().bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .block(Duration.ofSeconds(4));
            List<Map<String, Object>> all = extractList(res, "content");
            if (all != null && !all.isEmpty()) {
                long pending = all.stream().filter(o -> "PENDING".equals(o.get("status"))).count();
                long created = all.stream().filter(o -> "CREATED".equals(o.get("status"))).count();
                long collected = all.stream().filter(o -> "COLLECTED".equals(o.get("status"))).count();
                long inTransit = all.stream().filter(o -> "IN_TRANSIT".equals(o.get("status"))).count();
                long atHub = all.stream().filter(o -> "AT_HUB".equals(o.get("status"))).count();
                long picking = all.stream().filter(o -> "PICKING".equals(o.get("status"))).count();
                long delivering = all.stream().filter(o -> "DELIVERING".equals(o.get("status"))).count();
                long completed = all.stream().filter(o -> "COMPLETED".equals(o.get("status"))).count();
                long cancelled = all.stream().filter(o -> "CANCELLED".equals(o.get("status"))).count();
                long returning = all.stream().filter(o -> "RETURNING".equals(o.get("status"))).count();

                sb.append("\n[Thống kê đơn hàng của tôi]\n");
                sb.append("  - Chờ xử lý (PENDING): ").append(pending).append("\n");
                sb.append("  - Đã thanh toán (CREATED): ").append(created).append("\n");
                sb.append("  - Đã gửi tại Hub (COLLECTED): ").append(collected).append("\n");
                sb.append("  - Đang trung chuyển (IN_TRANSIT): ").append(inTransit).append("\n");
                sb.append("  - Đã tới Hub đích (AT_HUB): ").append(atHub).append("\n");
                sb.append("  - Shipper đang lấy (PICKING): ").append(picking).append("\n");
                sb.append("  - Đang giao (DELIVERING): ").append(delivering).append("\n");
                sb.append("  - Hoàn thành (COMPLETED): ").append(completed).append("\n");
                sb.append("  - Đã huỷ (CANCELLED): ").append(cancelled).append("\n");
                sb.append("  - Đang hoàn đơn (RETURNING): ").append(returning).append("\n");
                sb.append("  - Tổng số đơn: ").append(all.size()).append("\n");

                // Thống kê chi tiêu
                double totalSpent = all.stream()
                        .filter(o -> "COMPLETED".equals(o.get("status")))
                        .mapToDouble(o -> o.get("totalPrice") != null ? ((Number) o.get("totalPrice")).doubleValue() : 0)
                        .sum();
                double totalCod = all.stream()
                        .mapToDouble(o -> o.get("codAmount") != null ? ((Number) o.get("codAmount")).doubleValue() : 0)
                        .sum();
                double totalCodCompleted = all.stream()
                        .filter(o -> "COMPLETED".equals(o.get("status")) && "ONLINE_PAYMENT".equals(o.get("paymentMethod")))
                        .mapToDouble(o -> o.get("codAmount") != null ? ((Number) o.get("codAmount")).doubleValue() : 0)
                        .sum();
                sb.append("\n[Thống kê chi tiêu]\n");
                sb.append("  - Tổng cước vận chuyển (không tính đơn huỷ): ").append(String.format("%.0f", totalSpent)).append("d\n");
                sb.append("  - Tổng tiền COD (thu hộ) khai báo: ").append(String.format("%.0f", totalCod)).append("d\n");
                sb.append("  - Tổng COD đã thu hộ thành công (COMPLETED): ").append(String.format("%.0f", totalCodCompleted)).append("d\n");

                // 5 đơn gần nhất
                sb.append("\n[5 Đơn gần nhất]\n");
                all.stream().limit(5).forEach(o -> sb
                        .append("  - #").append(o.get("id"))
                        .append(" | Người nhận: ").append(o.get("receiverName"))
                        .append(" | Địa chỉ nhận: ").append(o.get("receiverAddress"))
                        .append(" | Trạng thái: ").append(o.get("status"))
                        .append(" | COD: ").append(o.get("codAmount")).append("d")
                        .append(" | Tổng cước: ").append(o.get("totalPrice")).append("d")
                        .append(" | Thanh toán điện tử: ").append(o.get("paymentMethod")).append("\n"));
            } else {
                sb.append("\n[Đơn hàng] Chưa có đơn hàng nào.\n");
            }
        } catch (Exception e) {
            log.warn("customerData - orders: {}", e.getMessage());
        }

        // Đánh giá
        if (msg.contains("phản hồi") || msg.contains("đánh giá") || msg.contains("nhận xét") || msg.contains("feedback")) {
            try {
                List<Map<String, Object>> feedbacks = webClientBuilder.build().get()
                        .uri(FEEDBACK_SERVICE_URL + "/my-feedbacks")
                        .header("X-User-Id", userId).header("X-User-Roles", "CUSTOMER")
                        .retrieve().bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                        })
                        .block(Duration.ofSeconds(2));
                if (feedbacks != null && !feedbacks.isEmpty()) {
                    sb.append("\n[Phản hồi của tôi]\n");
                    feedbacks.stream().limit(5).forEach(f -> sb.append("  - Đơn #")
                            .append(f.get("orderId")).append(": ")
                            .append(f.get("rating")).append(" sao | ").append(f.get("content")).append("\n"));
                } else {
                    sb.append("\n[Phản hồi] Chưa có phản hồi nào.\n");
                }
            } catch (Exception e) {
                log.warn("customerData - feedbacks: {}", e.getMessage());
            }
        }

        return sb.toString();
    }

    // SHIPPER
    private String shipperData(String userId, String msg) {
        StringBuilder sb = new StringBuilder();
        LocalDate now = LocalDate.now();

        // Tất cả đơn của Shipper
        try {
            List<Map<String, Object>> allOrders = webClientBuilder.build().get()
                    .uri(ORDER_SERVICE_URL + "/shipper/my-orders")
                    .header("X-User-Id", userId).header("X-User-Roles", "SHIPPER")
                    .retrieve().bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                    })
                    .block(Duration.ofSeconds(4));

            if (allOrders != null) {
                long picking = allOrders.stream().filter(o -> "PICKING".equals(o.get("status"))).count();
                long delivering = allOrders.stream().filter(o -> "DELIVERING".equals(o.get("status"))).count();
                long completed = allOrders.stream().filter(o -> "COMPLETED".equals(o.get("status"))).count();
                long returning = allOrders.stream().filter(o -> "RETURNING".equals(o.get("status"))).count();

                sb.append("\n[Thống kê đơn Shipper]\n");
                sb.append("  - Chờ lấy hàng (PICKING): ").append(picking).append("\n");
                sb.append("  - Đang giao (DELIVERING): ").append(delivering).append("\n");
                sb.append("  - Hoàn thành (COMPLETED): ").append(completed).append("\n");
                sb.append("  - Đang hoàn hàng (RETURNING): ").append(returning).append("\n");

                // Chi tiết đơn PICKING / DELIVRERING
                List<Map<String, Object>> active = allOrders.stream()
                        .filter(o -> "PICKING".equals(o.get("status")) || "DELIVERING".equals(o.get("status")))
                        .limit(5).toList();
                if (!active.isEmpty()) {
                    sb.append("\n[Đơn đang xử lý]\n");
                    active.forEach(o -> sb
                            .append("  - #").append(o.get("id"))
                            .append(" | ").append(o.get("receiverName"))
                            .append(" | ").append(o.get("receiverAddress"))
                            .append(" | Trạng thái: ").append(o.get("status"))
                            .append(" | Thu hộ: ").append(o.get("finalAmountToCollect")).append("d")
                            .append(" | Tuyến: ").append(o.get("routeId")).append("\n"));
                }
            }
        } catch (Exception e) {
            log.warn("shipperData - my-orders: {}", e.getMessage());
        }

        // Doanh thu
        if (msg.contains("doanh thu") || msg.contains("thu nhập") || msg.contains("tiền")
                || msg.contains("thu hộ") || msg.contains("hoa hồng")) {
            try {
                // Doanh thu theo filter (today/week/month/all)
                Map<String, Object> filterRev = webClientBuilder.build().get()
                        .uri(ORDER_SERVICE_URL + "/shipper/" + userId + "/revenue-by-filter?filter=month")
                        .header("X-User-Id", userId).header("X-User-Roles", "SHIPPER")
                        .retrieve().bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                        })
                        .block(Duration.ofSeconds(3));
                if (filterRev != null) {
                    sb.append("\n[Doanh thu tháng này]\n");
                    sb.append("  - Số đơn hoàn thành: ").append(filterRev.get("completedOrders")).append("\n");
                    sb.append("  - Thu nhập (lương cứng + hoa hồng COD): ").append(filterRev.get("totalEarnings")).append("d\n");
                    sb.append("  - Tổng thu hộ COD: ").append(filterRev.get("totalCodCollected")).append("d\n");
                }

                // Doanh thu theo ngày trong tháng
                Map<String, Object> monthlyRev = webClientBuilder.build().get()
                        .uri(ORDER_SERVICE_URL + "/shipper/" + userId + "/revenue?month=" + now.getMonthValue() + "&year=" + now.getYear())
                        .header("X-User-Id", userId).header("X-User-Roles", "SHIPPER")
                        .retrieve().bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                        })
                        .block(Duration.ofSeconds(3));
                if (monthlyRev != null) {
                    sb.append("  - Tổng đơn hoàn thành tháng ").append(now.getMonthValue()).append(": ")
                            .append(monthlyRev.get("totalOrders")).append("\n");
                }
            } catch (Exception e) {
                log.warn("shipperData - revenue: {}", e.getMessage());
            }
        }

        // Tuyến khả dụng
        if (msg.contains("khả dụng") || msg.contains("nhận tuyến") || msg.contains("tuyến mới")
                || msg.contains("tuyến có sẵn") || msg.contains("tuyến hiện tại")) {
            try {
                Map<String, Object> avail = webClientBuilder.build().get()
                        .uri(ORDER_SERVICE_URL + "/shipper/available-routes")
                        .header("X-User-Id", userId).header("X-User-Roles", "SHIPPER")
                        .retrieve().bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                        })
                        .block(Duration.ofSeconds(3));
                List<Map<String, Object>> routes = extractList(avail, "content");
                int cnt = routes != null ? routes.size() : 0;
                sb.append("\n[Tuyến khả dụng] Hiện có ").append(cnt).append(" tuyến mới trong khu vực của bạn.\n");
                if (routes != null && !routes.isEmpty()) {
                    routes.stream().limit(5).forEach(r -> sb
                            .append("  - Tuyen #").append(r.get("id"))
                            .append(" | ").append(r.get("totalOrders")).append(" don")
                            .append(" | Hub: ").append(r.get("hubName")).append("\n"));
                }
            } catch (Exception e) {
                log.warn("shipperData - available-routes: {}", e.getMessage());
            }
        }

        // Lịch sử giao hàng
        if (msg.contains("lịch sử") || msg.contains("hoàn thành") || msg.contains("history") || msg.contains("xong")) {
            try {
                List<Map<String, Object>> history = webClientBuilder.build().get()
                        .uri(ORDER_SERVICE_URL + "/shipper/my-orders?status=COMPLETED")
                        .header("X-User-Id", userId).header("X-User-Roles", "SHIPPER")
                        .retrieve().bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                        })
                        .block(Duration.ofSeconds(3));
                int cnt = history != null ? history.size() : 0;
                sb.append("\n[Lịch sử giao hàng] Tổng ").append(cnt).append(" đơn đã hoàn thành.\n");
                if (history != null && !history.isEmpty()) {
                    history.stream().limit(5).forEach(o -> sb
                            .append("  - #").append(o.get("id"))
                            .append(" | ").append(o.get("receiverName"))
                            .append(" | COD: ").append(o.get("codAmount")).append("d\n"));
                }
            } catch (Exception e) {
                log.warn("shipperData - history: {}", e.getMessage());
            }
        }

        return sb.toString();
    }

    // HUB ADMIN
    private String hubAdminData(String adminId, String msg) {
        StringBuilder sb = new StringBuilder();
        LocalDate now = LocalDate.now();
        String hubId = null;

        try {
            hubId = webClientBuilder.build().get()
                    .uri(HUB_INTERNAL_URL + "/manager/" + adminId)
                    .retrieve().bodyToMono(String.class).block(Duration.ofSeconds(2));
        } catch (Exception e) {
            log.warn("hubAdminData - getHubId: {}", e.getMessage());
            return "[Bưu cục] Không xác định được bưu cục bạn đang quản lý.\n";
        }
        if (hubId == null) return "[Bưu cục] Bạn chưa được gán quản lý bưu cục vào.\n";

        // Thông tin chi tiết Hub
        try {
            Map<String, Object> hubDetail = webClientBuilder.build().get()
                    .uri(HUB_SERVICE_URL + "/me")
                    .header("X-User-Id", adminId).header("X-User-Roles", "HUB_ADMIN")
                    .retrieve().bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .block(Duration.ofSeconds(2));
            if (hubDetail != null) {
                sb.append("\n[Bưu cục đang quản lý]\n");
                sb.append("  - Tên: ").append(hubDetail.get("name")).append("\n");
                sb.append("  - Mã: ").append(hubDetail.get("code")).append("\n");
                sb.append("  - Địa chỉ: ").append(hubDetail.get("address"))
                        .append(", ").append(hubDetail.get("ward"))
                        .append(", ").append(hubDetail.get("district"))
                        .append(", ").append(hubDetail.get("province")).append("\n");
                sb.append("  - Trạng thái: ")
                        .append(Boolean.TRUE.equals(hubDetail.get("active")) ? "Hoạt động" : "Tạm ngưng").append("\n");
            } else {
                sb.append("\n[Bưu cục đang quản lý] HubID: ").append(hubId).append("\n");
            }
        } catch (Exception e) {
            log.warn("hubAdminData - hub detail: {}", e.getMessage());
        }

        // Tồn kho
        try {
            Map<String, Object> inv = webClientBuilder.build().get()
                    .uri(ORDER_SERVICE_URL + "/hub/" + hubId + "?size=500")
                    .header("X-User-Id", adminId).header("X-User-Roles", "HUB_ADMIN")
                    .retrieve().bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .block(Duration.ofSeconds(3));
            List<Map<String, Object>> invList = extractList(inv, "content");
            if (invList != null) {
                long collected = invList.stream().filter(o -> "COLLECTED".equals(o.get("status"))).count();
                long inTransit = invList.stream().filter(o -> "IN_TRANSIT".equals(o.get("status"))).count();
                long atHub = invList.stream().filter(o -> "AT_HUB".equals(o.get("status"))).count();
                long picking = invList.stream().filter(o -> "PICKING".equals(o.get("status"))).count();
                long delivering = invList.stream().filter(o -> "DELIVERING".equals(o.get("status"))).count();
                long completed = invList.stream().filter(o -> "COMPLETED".equals(o.get("status"))).count();
                long returning = invList.stream().filter(o -> "RETURNING".equals(o.get("status"))).count();
                sb.append("\n[Thống kê tồn kho Hub]\n");
                sb.append("  - Tổng đơn: ").append(invList.size()).append("\n");
                sb.append("  - Vừa nhận từ khách (COLLECTED): ").append(collected).append("\n");
                sb.append("  - Đang trung chuyển (IN_TRANSIT): ").append(inTransit).append("\n");
                sb.append("  - Tới Hub đích (AT_HUB): ").append(atHub).append("\n");
                sb.append("  - Shipper đang lấy (PICKING): ").append(picking).append("\n");
                sb.append("  - Đang giao (DELIVERING): ").append(delivering).append("\n");
                sb.append("  - Hoàn thành (COMPLETED): ").append(completed).append("\n");
                sb.append("  - Hoàn hàng (RETURNING): ").append(returning).append("\n");

                // Đơn cần tạo trung chuyển (COLLECTED tại hub này, chưa có chuyến)
                List<Map<String, Object>> needTransfer = invList.stream()
                        .filter(o -> "COLLECTED".equals(o.get("status")))
                        .toList();
                sb.append("  - Đơn cần tạo trung chuyển (COLLECTED, chưa có chuyến): ").append(needTransfer.size()).append("\n");
                if (!needTransfer.isEmpty()) {
                    sb.append("\n[Đơn cần tạo trung chuyển (tối đa 20)]\n");
                    needTransfer.stream().limit(20).forEach(o -> sb
                            .append("  - #").append(o.get("id"))
                            .append(" | Người nhận: ").append(o.get("receiverName"))
                            .append(" | Địa chỉ nhận: ").append(o.get("receiverAddress"))
                            .append(" | Cân nặng: ").append(o.get("weight")).append("kg\n"));
                }
            }
        } catch (Exception e) {
            log.warn("hubAdminData - inventory: {}", e.getMessage());
        }

        // Đơn hàng đang giao trong tuyến
        if (msg.contains("tuyến") || msg.contains("giao") || msg.contains("shipper") || msg.contains("delivery")) {
            try {
                List<Map<String, Object>> delivery = webClientBuilder.build().get()
                        .uri(ORDER_SERVICE_URL + "/hub/" + hubId + "/delivery-orders")
                        .header("X-User-Id", adminId).header("X-User-Roles", "HUB_ADMIN")
                        .retrieve().bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                        })
                        .block(Duration.ofSeconds(3));
                int cnt = delivery != null ? delivery.size() : 0;
                sb.append("  - Đơn đang trong tuyến giao (PICKING+DELIVERING): ").append(cnt).append(" đơn\n");
            } catch (Exception e) {
                log.warn("hubAdminData - delivery-orders: {}", e.getMessage());
            }
        }

        // Đơn trung chuyển đang đến
        if (msg.contains("trung chuyển") || msg.contains("transit") || msg.contains("nhập kho") || msg.contains("chuyến")) {
            try {
                List<Map<String, Object>> transit = webClientBuilder.build().get()
                        .uri(ORDER_SERVICE_URL + "/hub/" + hubId + "/in-transit")
                        .header("X-User-Id", adminId).header("X-User-Roles", "HUB_ADMIN")
                        .retrieve().bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                        })
                        .block(Duration.ofSeconds(3));
                int cnt = transit != null ? transit.size() : 0;
                sb.append("  - Đơn trung chuyển đang trên đường đến Hub: ").append(cnt).append(" don\n");
            } catch (Exception e) {
                log.warn("hubAdminData - in-transit: {}", e.getMessage());
            }
        }

        // Doanh thu Hub
        if (msg.contains("doanh thu") || msg.contains("báo cáo") || msg.contains("thống kê")
                || msg.contains("revenue") || msg.contains("biểu đồ")) {
            try {
                Map<String, Object> rev = webClientBuilder.build().get()
                        .uri(ORDER_SERVICE_URL + "/hub/" + hubId + "/revenue?filter=month")
                        .header("X-User-Id", adminId).header("X-User-Roles", "HUB_ADMIN")
                        .retrieve().bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                        })
                        .block(Duration.ofSeconds(3));
                if (rev != null) {
                    sb.append("\n[Doanh thu hub tháng này]\n");
                    sb.append("  - Doanh thu Hub: ").append(rev.get("hubRevenue")).append("d\n");
                    sb.append("  - COD cần hoàn: ").append(rev.get("codAmount")).append("d\n");
                    sb.append("  - Số đơn đã giao: ").append(rev.get("orderCount")).append("\n");
                    sb.append("  - Số tuyến hoàn thanh: ").append(rev.get("routeCount")).append("\n");
                }

                // Doanh thu theo ngày trong tháng
                List<Map<String, Object>> daily = webClientBuilder.build().get()
                        .uri(ORDER_SERVICE_URL + "/hub/" + hubId + "/daily-revenue?month=" + now.getMonthValue() + "&year=" + now.getYear())
                        .header("X-User-Id", adminId).header("X-User-Roles", "HUB_ADMIN")
                        .retrieve().bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                        })
                        .block(Duration.ofSeconds(3));
                if (daily != null && !daily.isEmpty()) {
                    double totalDaily = daily.stream()
                            .mapToDouble(d -> d.get("hubRevenue") != null
                                    ? ((Number) d.get("hubRevenue")).doubleValue() : 0)
                            .sum();
                    sb.append("  - Tổng doanh thu theo ngày tháng ").append(now.getMonthValue())
                            .append(": ").append(String.format("%.0f", totalDaily)).append("d\n");
                }
            } catch (Exception e) {
                log.warn("hubAdminData - revenue: {}", e.getMessage());
            }
        }

        return sb.toString();
    }

    // SUPER ADMIN
    private String adminData(String adminId, String msg) {
        StringBuilder sb = new StringBuilder();

        // Doanh thu hệ thống
        try {
            Map<String, Object> sysToday = webClientBuilder.build().get()
                    .uri(ORDER_SERVICE_URL + "/system/revenue?filter=today")
                    .header("X-User-Id", adminId).header("X-User-Roles", "SUPER_ADMIN")
                    .retrieve().bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .block(Duration.ofSeconds(3));
            Map<String, Object> sysAll = webClientBuilder.build().get()
                    .uri(ORDER_SERVICE_URL + "/system/revenue?filter=all")
                    .header("X-User-Id", adminId).header("X-User-Roles", "SUPER_ADMIN")
                    .retrieve().bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .block(Duration.ofSeconds(3));
            sb.append("\n[Tổng quan hệ thống]\n");
            if (sysToday != null) {
                sb.append("  - Hôm nay: ").append(sysToday.get("orderCount"))
                        .append(" đơn | Doanh thu: ").append(sysToday.get("totalRevenue")).append("d\n");
            }
            if (sysAll != null) {
                sb.append("  - Tất cả: ").append(sysAll.get("orderCount"))
                        .append(" đơn | Tổng doanh thu: ").append(sysAll.get("totalRevenue")).append("d\n");
                sb.append("  - Tổng COD: ").append(sysAll.get("codAmount")).append("d\n");
            }
        } catch (Exception e) {
            log.warn("adminData - system revenue: {}", e.getMessage());
        }

        // Thống kê đơn hàng theo trạng thái
        if (msg.contains("đơn") || msg.contains("order") || msg.contains("trạng thái") || msg.contains("thống kê")) {
            try {
                Map<String, Object> orders = webClientBuilder.build().get()
                        .uri(ORDER_SERVICE_URL + "?size=10&sort=createdAt,desc")
                        .header("X-User-Id", adminId).header("X-User-Roles", "SUPER_ADMIN")
                        .retrieve().bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                        })
                        .block(Duration.ofSeconds(3));
                long total = orders != null && orders.get("totalElements") != null
                        ? ((Number) orders.get("totalElements")).longValue() : 0;
                List<Map<String, Object>> content = extractList(orders, "content");
                sb.append("\n[Đơn hàng toàn hệ thống]\n");
                sb.append("  - Tổng số đơn: ").append(total).append("\n");
                if (content != null && !content.isEmpty()) {
                    sb.append("  - 10 đơn mới nhất:\n");
                    content.forEach(o -> sb.append("    * #").append(o.get("id"))
                            .append(" | Người gửi: ").append(o.get("senderName"))
                            .append(" | Người nhận: ").append(o.get("receiverName"))
                            .append(" | Trạng thái: ").append(o.get("status")).append("\n"));
                }
            } catch (Exception e) {
                log.warn("adminData - orders: {}", e.getMessage());
            }
        }

        // Biểu đồ doanh thu 12 tháng
        if (msg.contains("tháng") || msg.contains("biểu đồ") || msg.contains("12 tháng") || msg.contains("chart") || msg.contains("năm")) {
            try {
                List<Map<String, Object>> monthly = webClientBuilder.build().get()
                        .uri(ORDER_SERVICE_URL + "/system/monthly-revenue-chart")
                        .header("X-User-Id", adminId).header("X-User-Roles", "SUPER_ADMIN")
                        .retrieve().bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                        })
                        .block(Duration.ofSeconds(3));
                if (monthly != null && !monthly.isEmpty()) {
                    sb.append("\n[Doanh thu 12 tháng gần nhất]\n");
                    monthly.stream().limit(12).forEach(m ->
                            sb.append("  - Tháng ").append(m.get("month")).append("/").append(m.get("year"))
                                    .append(": ").append(m.get("totalRevenue")).append("d\n"));
                }
            } catch (Exception e) {
                log.warn("adminData - monthly-revenue-chart: {}", e.getMessage());
            }
        }

        // Thống kê bưu cục
        if (msg.contains("bưu cục") || msg.contains("hub") || msg.contains("địa điểm") || msg.contains("kho")) {
            try {
                Map<String, Object> hubs = webClientBuilder.build().get()
                        .uri(HUB_ADMIN_URL + "?size=100&sort=createdAt,desc")
                        .header("X-User-Id", adminId).header("X-User-Roles", "SUPER_ADMIN")
                        .retrieve().bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                        })
                        .block(Duration.ofSeconds(3));
                List<Map<String, Object>> hubList = extractList(hubs, "content");
                long totalHubs = hubs != null && hubs.get("totalElements") != null
                        ? ((Number) hubs.get("totalElements")).longValue() : 0;
                long activeHubs = hubList != null ? hubList.stream()
                        .filter(h -> Boolean.TRUE.equals(h.get("active"))).count() : 0;
                sb.append("\n[Bưu cục]\n");
                sb.append("  - Tổng: ").append(totalHubs).append(" | Hoạt động: ").append(activeHubs)
                        .append(" | Tạm dừng: ").append(totalHubs - activeHubs).append("\n");
                if (hubList != null && !hubList.isEmpty()) {
                    hubList.stream().limit(10).forEach(h -> sb
                            .append("  - [").append(h.get("code")).append("] ").append(h.get("name"))
                            .append(" | ").append(h.get("district"))
                            .append(" | ").append(Boolean.TRUE.equals(h.get("active")) ? "Hoạt động" : "Tạm dừng").append("\n"));
                }
            } catch (Exception e) {
                log.warn("adminData - hubs: {}", e.getMessage());
            }
        }

        // Thống kê người dùng theo role
        if (msg.contains("người dùng") || msg.contains("tài khoản") || msg.contains("user")
                || msg.contains("shipper") || msg.contains("khách hàng")) {
            try {
                Map<String, Object> users = webClientBuilder.build().get()
                        .uri(AUTH_SERVICE_URL + "?size=2000")
                        .header("X-User-Id", adminId).header("X-User-Roles", "SUPER_ADMIN")
                        .retrieve().bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                        })
                        .block(Duration.ofSeconds(4));
                long totalUsers = users != null && users.get("totalElements") != null
                        ? ((Number) users.get("totalElements")).longValue() : 0;
                List<Map<String, Object>> userList = extractList(users, "content");
                sb.append("\n[Người dùng] Tổng: ").append(totalUsers).append(" tài khoản.\n");
                if (userList != null) {
                    long customers = userList.stream().filter(u -> hasRole(u, "CUSTOMER")).count();
                    long shippers = userList.stream().filter(u -> hasRole(u, "SHIPPER")).count();
                    long hubAdmins = userList.stream().filter(u -> hasRole(u, "HUB_ADMIN")).count();
                    sb.append("  - Khách hàng (CUSTOMER): ").append(customers).append("\n");
                    sb.append("  - Shipper: ").append(shippers).append("\n");
                    sb.append("  - Hub Admin: ").append(hubAdmins).append("\n");
                }
            } catch (Exception e) {
                log.warn("adminData - users: {}", e.getMessage());
            }
        }

        // Phản hồi khách hàng
        if (msg.contains("phản hồi") || msg.contains("đánh giá") || msg.contains("nhận xét") || msg.contains("feedback")) {
            try {
                List<Map<String, Object>> feedbacks = webClientBuilder.build().get()
                        .uri(FEEDBACK_SERVICE_URL)
                        .header("X-User-Id", adminId).header("X-User-Roles", "SUPER_ADMIN")
                        .retrieve().bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {
                        })
                        .block(Duration.ofSeconds(3));
                int cnt = feedbacks != null ? feedbacks.size() : 0;
                sb.append("\n[Phản hồi khách hàng] Tổng: ").append(cnt).append(" phản hồi trong hệ thống.\n");
                if (feedbacks != null && !feedbacks.isEmpty()) {
                    feedbacks.stream().limit(5).forEach(f -> sb
                            .append("  - Đơn #").append(f.get("orderId"))
                            .append(" | ").append(f.get("rating")).append(" sao")
                            .append(" | ").append(f.get("content")).append("\n"));
                }
            } catch (Exception e) {
                log.warn("adminData - feedbacks: {}", e.getMessage());
            }
        }

        return sb.toString();
    }

    // Build Prompt
    private String buildPrompt(String question, List<String> roles, String name, String liveData) {
        String systemScope = buildRoleScope(roles);
        String roleStr = String.join(", ", roles);
        String liveSection = liveData.isBlank()
                ? "(Không có dữ liệu thực tế được truy xuất cho câu hỏi này)"
                : liveData.trim();

        return """
                Bạn là trợ lý ảo AI của HustGo - nền tảng giao hàng chặng cuối tại Hà Nội.
                Bạn đang hỗ trợ người dùng có tên: **%s** | Vai trò: **%s**
                
                ==================================================
                THÔNG TIN CHUNG VỀ HUSTGO (áp dụng cho mọi người dùng):
                ==================================================
                - HustGo là nền tảng quản lý mạng lưới giao hàng chặng cuối phạm vi Hà Nội.
                - Quy trình: Khách hàng tạo đơn -> Bưu cục tiếp nhận -> Trung chuyển tới Bưu cục đích -> Phân tuyến cho Shipper -> Giao hàng tận tay.
                - Các bước tra cứu đơn hàng: Nhập mã đơn vào ô tra cứu ở trang chủ.
                - Bảng giá cước vận chuyển và phụ phí:
                  * Trọng lượng tính phí: Hệ thống lấy mức lớn hơn giữa Trọng lượng thực tế và Trọng lượng quy đổi (Dài x Rộng x Cao / 5000).
                  * Phí cơ bản: Nội thành - Nội thành (20.000đ); Ngoại thành - Ngoại thành (35.000đ); Giao chéo nội thành - ngoại thành (30.000đ); Thiếu thông tin quận (mặc định 35.000đ).
                  * Phí vượt trọng lượng: Đơn trên 0.5kg cộng thêm 2.500đ cho mỗi 0.5kg tiếp theo.
                  * Phí gói dịch vụ: Gói Economy (0đ), Gói Fast (+5.000đ), Gói Express (+15.000đ).
                  * Phụ phí vùng: Điểm gửi ngoài nội thành (+5.000đ), điểm nhận ngoài nội thành (+5.000đ).
                  * Phí COD (nếu có): 0.8%% số tiền thu hộ (tối thiểu 15.000đ).
                  * Phí bảo hiểm (nếu có): Nếu giá trị hàng trên 1.000.000đ, phí bảo hiểm bằng 0.5%% giá trị hàng.
                ==================================================
                QUY TẮC TRẢ LỜI BẮT BUỘC:
                ==================================================
                1. Trả lời hoàn toàn bằng tiếng Việt, chuyên nghiệp và thân thiện.
                2. Các thông tin quan trọng: mã đơn, số tiền, trạng thái, các con số quan trọng,... phải được <b>bôi đậm</b>.
                3. Giữa các phần PHẢI có dòng trống <br/> ở cuối mỗi ý.
                4. Danh sách PHẢI dùng dấu "- " ở đầu mỗi mục.
                5. Tuyệt đối KHÔNG tự bịa đặt dữ liệu đơn hàng, tên người dùng hay số liệu nếu không có trong context.
                6. Nếu câu hỏi nằm ngoài phạm vi quyền của role này, lịch sự từ chối và giải thích.
                7. Kết thúc mỗi câu trả lời bằng lời hỏi thêm hoặc lời chào thân thiện.
                
                ==================================================
                PHẠM VI QUYỀN HỎI ĐÁP CỦA VAI TRÒ **%s**:
                ==================================================
                %s
                
                ==================================================
                DỮ LIỆU THỰC TẾ TỪ HỆ THỐNG (real-time):
                ==================================================
                %s
                
                ==================================================
                CÂU HỎI CỦA NGƯỜI DÙNG:
                ==================================================
                "%s"
                
                Trả lời:
                """.formatted(name, roleStr, roleStr, systemScope, liveSection, question);
    }

    // Mô tả phạm vi quyền hạn từng Role
    private String buildRoleScope(List<String> roles) {
        String guestScope = """
                BẠN CÓ THỂ GIẢI ĐÁP:
                - Thông tin giới thiệu về HustGo (dịch vụ, phạm vi hoạt động).
                - Bảng giá cước vận chuyển và cách tính phí.
                - Hướng dẫn đăng ký tài khoản khách hàng / shipper.
                - Hướng dẫn cách tạo đơn hàng (quy trình, thông tin cần nhập).
                - Cách tra cứu đơn hàng bằng mã đơn trên trang chủ.
                - Hướng dẫn thanh toán (COD, MoMo).
                - Câu hỏi thường gặp về dịch vụ giao hàng.
                - Thông tin liên hệ hỗ trợ, hotline.
                BẠN KHÔNG ĐƯỢC:
                - Trả lời về dữ liệu đơn hàng cụ thể của bất kỳ người dùng nào.
                - Trả lời câu hỏi liên quan đến quản trị hệ thống.""";

        StringBuilder scope = new StringBuilder(guestScope);

        if (roles.contains("CUSTOMER")) {
            scope.append("""
                    
                    NGOÀI RA VỚI VAI TRÒ KHÁCH HÀNG, BẠN CÓ THỂ GIẢI ĐÁP THÊM:
                    - Dashboard: Thống kê đơn hàng theo trạng thái (PENDING, CREATED, COLLECTED, IN_TRANSIT, AT_HUB, PICKING, DELIVERING, COMPLETED, CANCELLED, RETURNING), tổng chi tiêu, biểu đồ theo ngày/tháng.
                    - Tạo đơn hàng: Nhập thông tin người gửi, người nhận, hàng hóa, dịch vụ và COD.
                    - Lịch sử đơn hàng: Xem, lọc, tra cứu đơn theo trạng thái.
                    - Phản hồi / Đánh giá: Xem, tạo, sửa, xóa đánh giá sau khi nhận hàng.
                    - Theo dõi hành trình: Nhập mã đơn -> xem timeline trạng thái và bản đồ vị trí shipper.
                    - Hủy đơn (khi đơn chưa được Hub xử lý).
                    - Lấy URL thanh toán MoMo cho đơn.
                    - Theo dõi chi tiêu
                    BẠN KHÔNG ĐƯỢC:
                    - Trả lời câu hỏi quản trị Hub, quản lý shipper, hay báo cáo hệ thống.""");
        }

        if (roles.contains("SHIPPER")) {
            scope.append("""
                    
                    NGOÀI RA VỚI VAI TRÒ SHIPPER, BẠN CÓ THỂ GIẢI ĐÁP THÊM:
                    - Dashboard Shipper: Thống kê đơn (PICKING/DELIVERING/COMPLETED/RETURNING), tổng thu hộ, tổng doanh thu (lương cứng + hoa hồng COD), biểu đồ theo ngày/tháng.
                    - Tuyến khả dụng (AvailableRoutes): Xem các tuyến giao hàng mới trong khu vực và cách nhận tuyến.
                    - Đơn đang giao (ActiveDelivery): Xem bản đồ tuyến đường, danh sách đơn đang phụ trách, cập nhật trạng thái giao từng đơn.
                    - Cập nhật trạng thái giao hàng (giao thành công / thất bại / hoàn hàng).
                    - Bắt đầu / kết thúc giao hàng trong một tuyến.
                    - GPS và định vị: Cách bật, sử dụng và tại sao cần định vị.
                    - Lịch sử giao hàng (DeliveryHistory): Xem lại tất cả đơn đã giao trong quá khứ.
                    - Doanh thu: Xem theo tháng, theo filter (hôm nay/tuần/tháng/tất cả).
                    BẠN KHÔNG ĐƯỢC:
                    - Trả lời về quản lý Hub, phân tuyến từ phía Hub Admin, hay báo cáo toàn hệ thống.""");
        }

        if (roles.contains("HUB_ADMIN")) {
            scope.append("""
                    
                    NGOÀI RA VỚI VAI TRÒ HUB ADMIN, BẠN CÓ THỂ GIẢI ĐÁP THÊM:
                    - Dashboard Hub: Thống kê đơn tồn kho theo trạng thái (COLLECTED/IN_TRANSIT/AT_HUB/PICKING/DELIVERING/COMPLETED/RETURNING), doanh thu Hub hôm nay / tuần / tháng, biểu đồ theo ngày/tháng.
                    - Tiếp nhận đơn từ khách (ReceiveOrders): Xác nhận đơn khách mang đến bưu cục.
                    - Nhập kho trung chuyển (TransferReceiving): Xác nhận đơn trung chuyển từ Hub khác đến.
                    - Tạo chuyến trung chuyển (TransferCreate): Gom đơn theo Hub đích và lên lịch chuyển.
                    - Quản lý tồn kho tại Hub (HubInventory): Xem danh sách và trạng thái tất cả đơn đang trong kho.
                    - Phân tuyến giao hàng (RouteAssignment): Gom nhóm đơn theo khu vực và giao cho Shipper nhận tuyến.
                    - Theo dõi tuyến giao (RouteMonitoring): Xem các tuyến đang được shipper giao, theo dõi tiến độ.
                    - Tìm Shipper gần Hub: Xem danh sách shipper đang trong bán kính hub.
                    - Doanh thu Hub: Báo cáo theo ngày / tuần / tháng, biểu đồ 12 tháng.
                    BẠN KHÔNG ĐƯỢC:
                    - Trả lời câu hỏi quản trị toàn hệ thống (Super Admin) như quản lý tất cả Hub, người dùng, phản hồi,...""");
        }

        if (roles.contains("SUPER_ADMIN")) {
            scope.append("""
                    
                    NGOÀI RA VỚI VAI TRÒ SUPER ADMIN, BẠN CÓ THỂ GIẢI ĐÁP MỌI THỨ TRONG HỆ THỐNG:
                    - Dashboard hệ thống: Tổng quan đơn hàng theo trạng thái, doanh thu toàn hệ thống hôm nay / tháng, biểu đồ 12 tháng, thống kê theo Hub.
                    - Quản lý đơn hàng (AdminOrderList): Xem tất cả đơn hàng, lọc theo trạng thái / khách hàng.
                    - Quản lý bưu cục (AdminHubManagement): Xem danh sách (tổng/hoạt động/tạm ngừng), tạo mới, cập nhật, xóa Hub, gán quản lý.
                    - Quản lý người dùng (AdminUserManagement): Xem tất cả tài khoản (tổng/customer/shipper/hub-admin), phân quyền, xóa tài khoản.
                    - Quản lý phản hồi (FeedbackManagement): Xem tất cả phản hồi từ khách hàng trong hệ thống, xóa phản hồi.
                    - Báo cáo doanh thu: Toàn hệ thống theo hôm nay/tuần/tháng/tất cả, biểu đồ 12 tháng, doanh thu theo từng Hub.
                    - Vận hành: Giám sát tổng quan mạng lưới Hub, Shipper và đơn hàng trên toàn hệ thống.""");
        }

        return scope.toString();
    }

    // Helper: kiểm tra user có role nhất định không
    @SuppressWarnings("unchecked")
    private boolean hasRole(Map<String, Object> user, String roleName) {
        Object rolesObj = user.get("roles");
        if (rolesObj == null) return false;
        if (rolesObj instanceof List<?> roles) {
            return roles.stream().anyMatch(r -> {
                if (r instanceof Map<?, ?> rm) {
                    Object name = rm.get("name");
                    return roleName.equals(name) || ("ROLE_" + roleName).equals(name);
                }
                return roleName.equals(r.toString()) || ("ROLE_" + roleName).equals(r.toString());
            });
        }
        return false;
    }

    // Trích xuất List từ Map response phân trang
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractList(Map<String, Object> response, String key) {
        if (response == null) return null;
        Object val = response.get(key);
        if (val instanceof List<?>) return (List<Map<String, Object>>) val;
        return null;
    }
}