package vn.edu.hust.routing_service.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import vn.edu.hust.routing_service.dto.LocationPoint;
import vn.edu.hust.routing_service.dto.OptimizationRequest;
import vn.edu.hust.routing_service.dto.OptimizedRouteResponse;
import vn.edu.hust.routing_service.exception.HustGoException;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class RouteOptimizationService {

    private final OsrmService osrmService;

    // Tối ưu hoá tuyến đường bawnfg Greedy + 2-opt
    public OptimizedRouteResponse optimizeDeliveryRoute(OptimizationRequest request) {
        LocationPoint start = request.getStartPoint();
        List<LocationPoint> deliveries = request.getDeliveryPoints();

        if (start == null || deliveries == null || deliveries.isEmpty()) {
            throw new HustGoException(HttpStatus.BAD_REQUEST, "Dữ liệu phân tuyến đầu vào không hợp lệ");
        }

        // Để start point và danh sách đơn hàng vào 1 list
        List<LocationPoint> allPoints = new ArrayList<>();
        allPoints.add(start);
        allPoints.addAll(deliveries);

        double[][] distanceMatrix = osrmService.getDistanceMatrix(allPoints);

        log.info("Bắt đầu thực thi giải thuật Greedy Nearest Neighbor với {} điểm", allPoints.size());
        List<LocationPoint> optimizedSequence = new ArrayList<>();
        optimizedSequence.add(start);

        boolean[] visited = new boolean[allPoints.size()];
        visited[0] = true;

        int currentIndex = 0;
        double greedyAccumulatedDistance = 0.0;

        for (int step = 1; step < allPoints.size(); step++) {
            int nextIndex = -1;
            double minDistance = Double.MAX_VALUE;

            for (int i = 0; i < allPoints.size(); i++) {
                if (!visited[i] && distanceMatrix[currentIndex][i] < minDistance) {
                    minDistance = distanceMatrix[currentIndex][i];
                    nextIndex = i;
                }
            }

            if (nextIndex != -1) {
                visited[nextIndex] = true;
                optimizedSequence.add(allPoints.get(nextIndex));
                greedyAccumulatedDistance += minDistance;
                currentIndex = nextIndex;
            }
        }

        log.info("Bắt đầu giải thuật 2-opt with {} points", distanceMatrix.length);
        Map<LocationPoint, Integer> pointIndexMap = new HashMap<>();
        for (int i = 0; i < allPoints.size(); i++) {
            pointIndexMap.put(allPoints.get(i), i);
        }
        optimizedSequence = twoOptImprove(optimizedSequence, distanceMatrix, pointIndexMap);

        Map<String, Object> routeDetails = osrmService.getDetailedRoute(optimizedSequence);

        double totalDistance = routeDetails.containsKey("distance")
                ? ((Number) routeDetails.get("distance")).doubleValue() : 0.0;

        double totalDuration = routeDetails.containsKey("duration")
                ? ((Number) routeDetails.get("duration")).doubleValue() : 0.0;

        // Nếu OSRM lỗi không trả về đúng
        if (totalDistance == 0.0) {
            totalDistance = greedyAccumulatedDistance;
        }

        if (totalDuration == 0.0 && totalDistance > 0.0) {
            totalDuration = totalDistance / 8.3; // ~30km/h trong đô thị nội thành Hà Nội
        }

        Object geometry = routeDetails.get("geometry");

        return OptimizedRouteResponse.builder()
                .optimizedSequence(optimizedSequence)
                .totalDistanceMeters(totalDistance)
                .totalDurationSeconds(totalDuration)
                .routeGeometry(geometry)
                .build();
    }


    private List<LocationPoint> twoOptImprove(List<LocationPoint> route, double[][] distanceMatrix,
                                              Map<LocationPoint, Integer> pointIndexMap) {
        if (route == null || route.size() < 4) {
            return route;
        }

        List<LocationPoint> improved = new ArrayList<>(route);
        boolean improvedInRound;
        int iterations = 0;
        final int MAX_ITERATIONS = 10000;

        do {
            improvedInRound = false;

            for (int i = 1; i < improved.size() - 2; i++) {
                for (int j = i + 1; j < improved.size() - 1; j++) {

                    if (++iterations > MAX_ITERATIONS) {
                        log.warn("Max iterations reached, stopping");
                        return improved;
                    }

                    LocationPoint a = improved.get(i - 1);
                    LocationPoint b = improved.get(i);
                    LocationPoint c = improved.get(j);
                    LocationPoint d = improved.get(j + 1);

                    int idxA = pointIndexMap.get(a);
                    int idxB = pointIndexMap.get(b);
                    int idxC = pointIndexMap.get(c);
                    int idxD = pointIndexMap.get(d);

                    double currentDist = distanceMatrix[idxA][idxB] + distanceMatrix[idxC][idxD];
                    double newDist = distanceMatrix[idxA][idxC] + distanceMatrix[idxB][idxD];

                    if (Double.isNaN(currentDist) || Double.isNaN(newDist) ||
                            Double.isInfinite(currentDist) || Double.isInfinite(newDist)) {
                        continue;
                    }

                    if (newDist < currentDist) {
                        // Đảo ngược đoạn từ i đến j
                        Collections.reverse(improved.subList(i, j + 1));
                        improvedInRound = true;
                    }
                }
            }
        } while (improvedInRound);

        return improved;
    }
}