package vn.edu.hust.routing_service.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class OptimizedRouteResponse {
    private List<LocationPoint> optimizedSequence;
    private double totalDistanceMeters;
    private double totalDurationSeconds;
    private Object routeGeometry;
}