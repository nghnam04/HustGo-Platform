package vn.edu.hust.routing_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LocationPoint {
    private String id;       // HubId / OrderId
    private double lat;
    private double lng;
    private String label;
}