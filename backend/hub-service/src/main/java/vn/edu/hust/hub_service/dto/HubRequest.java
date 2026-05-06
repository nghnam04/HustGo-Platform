package vn.edu.hust.hub_service.dto;

import jakarta.validation.constraints.*;
import vn.edu.hust.base_domain.constant.HanoiDistrict;

public record HubRequest(
        @NotBlank(message = "Mã Hub không được để trống")
        @Size(min = 3, max = 20, message = "Mã Hub phải từ 3 đến 20 ký tự")
        @Pattern(regexp = "^[A-Z0-9_]+$", message = "Mã Hub chỉ được chứa chữ hoa, số và dấu gạch dưới")
        String code,

        @NotBlank(message = "Tên Hub không được để trống")
        @Size(max = 100, message = "Tên Hub không được vượt quá 100 ký tự")
        String name,

        @NotBlank(message = "Địa chỉ không được để trống")
        String address,

        @NotNull(message = "Quận/Huyện phải thuộc Hà Nội và không được để trống")
        HanoiDistrict district,

        @NotNull(message = "Vĩ độ không được để trống")
        @Min(value = -90, message = "Vĩ độ phải từ -90 đến 90")
        @Max(value = 90, message = "Vĩ độ phải từ -90 đến 90")
        Double lat,

        @NotNull(message = "Kinh độ không được để trống")
        @Min(value = -180, message = "Kinh độ phải từ -180 đến 180")
        @Max(value = 180, message = "Kinh độ phải từ -180 đến 180")
        Double lng,

        @NotBlank(message = "ID quản trị viên Hub không được để trống")
        String managerId,

        @NotNull(message = "Trạng thái hoạt động không được để trống")
        Boolean active
) {
}