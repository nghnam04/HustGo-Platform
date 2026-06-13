package vn.edu.hust.order_service.dto;

import lombok.Data;
import java.util.List;

@Data
public class OptimizedRouteResponse {
    private List<LocationPoint> optimizedSequence;
    private double totalDistanceMeters;
    private double totalDurationSeconds;
    private Object routeGeometry;
}
