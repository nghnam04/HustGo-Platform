package vn.edu.hust.routing_service.dto;

import lombok.Data;

import java.util.List;

@Data
public class OptimizationRequest {
    private LocationPoint startPoint;
    private List<LocationPoint> deliveryPoints;
}