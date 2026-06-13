package vn.edu.hust.routing_service.service;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import vn.edu.hust.routing_service.dto.LocationPoint;
import vn.edu.hust.routing_service.exception.HustGoException;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
public class OsrmService {

    private final WebClient webClient;
    private final String osrmBaseUrl;
    private final ConcurrentHashMap<String, double[][]> matrixCache = new ConcurrentHashMap<>();

    public OsrmService(@Qualifier("externalWebClientBuilder") WebClient.Builder webClientBuilder,
                       @Value("${app.osrm.base-url}") String osrmBaseUrl) {

        this.osrmBaseUrl = osrmBaseUrl.endsWith("/") ? osrmBaseUrl : osrmBaseUrl + "/";

        this.webClient = webClientBuilder
                .baseUrl(this.osrmBaseUrl)
                .build();
    }

    private String buildCoordinatesPath(List<LocationPoint> points) {
        return points.stream()
                .map(p -> p.getLng() + "," + p.getLat())
                .collect(Collectors.joining(";"));
    }

    // Lấy ma trận khoảng cách
    @SuppressWarnings("unchecked")
    @Retry(name = "routing-service", fallbackMethod = "fallbackMatrix")
    @CircuitBreaker(name = "routing-service", fallbackMethod = "fallbackMatrix")
    public double[][] getDistanceMatrix(List<LocationPoint> allPoints) {
        String coords = buildCoordinatesPath(allPoints);

        return matrixCache.computeIfAbsent(coords, c -> {
            try {
                String fullUrl = osrmBaseUrl + "table/v1/bicycle/" + c + "?annotations=distance";
                Map<String, Object> response = webClient.get()
                        .uri(fullUrl)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                if (response == null || !response.containsKey("distances")) {
                    throw new HustGoException(HttpStatus.BAD_GATEWAY, "Không thể lấy ma trận khoảng cách từ OSRM Backend Engine");
                }

                List<List<Object>> distances = (List<List<Object>>) response.get("distances");
                int size = allPoints.size();
                double[][] matrix = new double[size][size];
                int nullCount = 0;
                for (int i = 0; i < size; i++) {
                    for (int j = 0; j < size; j++) {
                        Object val = distances.get(i).get(j);
                        if (val == null) {
                            matrix[i][j] = 0.0;
                            nullCount++;
                        } else {
                            double d = ((Number) val).doubleValue();
                            matrix[i][j] = (d < 0) ? 0.0 : d; // OSRM trả -1 cho không có đường
                        }
                    }
                }
                if (nullCount > 0) {
                    log.warn("[OSRM] WARNING: " + nullCount + " null/invalid distances in matrix");
                }
                return matrix;
            } catch (HustGoException e) {
                throw e;
            } catch (Exception e) {
                log.error("[OSRM] Lỗi kết nối Table Service: {}", e.getMessage());
                throw new HustGoException(HttpStatus.BAD_GATEWAY, "Lỗi kết nối OSRM Table Service: " + e.getMessage());
            }
        });
    }

    // Lấy chi tiết tuyến đường
    @SuppressWarnings("unchecked")
    @Retry(name = "routing-service", fallbackMethod = "fallbackRoute")
    @CircuitBreaker(name = "routing-service", fallbackMethod = "fallbackRoute")
    public Map<String, Object> getDetailedRoute(List<LocationPoint> orderedPoints) {
        String coords = buildCoordinatesPath(orderedPoints);

        try {
            String fullUrl = osrmBaseUrl + "route/v1/bicycle/" + coords + "?overview=full&geometries=geojson&steps=false";
            Map<String, Object> response = webClient.get()
                    .uri(fullUrl)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("routes")) {
                List<Map<String, Object>> routes = (List<Map<String, Object>>) response.get("routes");
                if (!routes.isEmpty()) {
                    return routes.get(0);
                }
            }
            return Map.of();
        } catch (Exception e) {
            log.error("[OSRM] Lỗi kết nối Route Service: {}", e.getMessage());
            throw new HustGoException(HttpStatus.BAD_GATEWAY, "Lỗi kết nối OSRM Route Service: " + e.getMessage());
        }
    }

    // Fallback methods
    private double[][] fallbackMatrix(List<LocationPoint> allPoints, Throwable ex) {
        log.error("[OSRM] Fallback getDistanceMatrix cho {} điểm: {}", allPoints.size(), ex.getMessage());
        throw new HustGoException(HttpStatus.SERVICE_UNAVAILABLE, "OSRM tạm thời không khả dụng, vui lòng thử lại sau");
    }

    private Map<String, Object> fallbackRoute(List<LocationPoint> orderedPoints, Throwable ex) {
        log.error("[OSRM] Fallback getDetailedRoute: {}", ex.getMessage());
        throw new HustGoException(HttpStatus.SERVICE_UNAVAILABLE, "OSRM tạm thời không khả dụng, vui lòng thử lại sau");
    }
}