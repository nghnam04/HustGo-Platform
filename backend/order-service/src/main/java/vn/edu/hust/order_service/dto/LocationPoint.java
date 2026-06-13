package vn.edu.hust.order_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationPoint {
    private String id;
    private double lat;
    private double lng;
    private String label;
}
