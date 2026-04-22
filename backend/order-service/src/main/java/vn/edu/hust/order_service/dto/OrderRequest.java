package vn.edu.hust.order_service.dto;

import jakarta.validation.constraints.*;
import lombok.Builder;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.hust.base_domain.constant.PaymentMethod;
import vn.edu.hust.base_domain.constant.ServiceCode;

@Builder
public record OrderRequest(
        // Người nhận
        @NotBlank(message = "Tên người nhận không được để trống")
        @Size(max = 100, message = "Tên người nhận không được vượt quá 100 ký tự")
        String receiverName,

        @NotBlank(message = "Số điện thoại người nhận không được để trống")
        @Pattern(regexp = "^(0|84)(3|5|7|8|9)[0-9]{8}$",
                message = "Số điện thoại nhận không đúng định dạng (phải đủ 10 số, bắt đầu bằng 0 hoặc 84)")
        String receiverPhone,

        @NotBlank(message = "Địa chỉ nhận không được để trống")
        String receiverAddress,

        @NotBlank(message = "Tỉnh/Thành nhận không được để trống")
        String receiverProvince,

        @NotBlank(message = "Quận/Huyện nhận không được để trống")
        String receiverDistrict,

        @NotBlank(message = "Phường/Xã nhận không được để trống")
        String receiverWard,

        @NotNull(message = "Tọa độ Lat người nhận không được để trống")
        Double receiverLat,

        @NotNull(message = "Tọa độ Lng người nhận không được để trống")
        Double receiverLng,

        // Người gửi
        @NotBlank(message = "Tên người gửi không được để trống")
        @Size(max = 100, message = "Tên người gửi không được vượt quá 100 ký tự")
        String senderName,

        @NotBlank(message = "Số điện thoại người gửi không được để trống")
        @Pattern(regexp = "^(0|84)(3|5|7|8|9)[0-9]{8}$",
                message = "Số điện thoại gửi không đúng định dạng")
        String senderPhone,

        @NotBlank(message = "Địa chỉ lấy hàng không được để trống")
        String senderAddress,

        @NotBlank(message = "Tỉnh/Thành gửi không được để trống")
        String senderProvince,

        @NotBlank(message = "Quận/Huyện gửi không được để trống")
        String senderDistrict,

        @NotBlank(message = "Phường/Xã gửi không được để trống")
        String senderWard,

        @NotNull(message = "Tọa độ Lat người gửi không được để trống")
        Double senderLat,

        @NotNull(message = "Tọa độ Lng người gửi không được để trống")
        Double senderLng,

        // Hàng hoá
        @NotBlank(message = "Tên sản phẩm không được để trống")
        @Size(max = 200, message = "Tên sản phẩm quá dài")
        String productName,

        @NotNull(message = "Khối lượng không được để trống")
        @DecimalMin(value = "0.01", message = "Khối lượng tối thiểu là 0.01 kg")
        @DecimalMax(value = "100.0", message = "Khối lượng tối đa cho phép là 100 kg")
        Double weight,

        @NotNull(message = "Chiều dài không được để trống")
        @Min(value = 1, message = "Chiều dài tối thiểu là 1cm")
        @Max(value = 200, message = "Chiều dài tối đa là 200cm")
        Integer length,

        @NotNull(message = "Chiều rộng không được để trống")
        @Min(value = 1, message = "Chiều rộng tối thiểu là 1cm")
        @Max(value = 200, message = "Chiều rộng tối đa là 200cm")
        Integer width,

        @NotNull(message = "Chiều cao không được để trống")
        @Min(value = 1, message = "Chiều cao tối thiểu là 1cm")
        @Max(value = 200, message = "Chiều cao tối đa là 200cm")
        Integer height,

        @NotNull(message = "Tiền COD không được để trống")
        @Min(value = 0, message = "Tiền COD không được âm")
        Double codAmount,

        @NotNull(message = "Giá trị hàng hóa không được để trống")
        @Min(value = 0, message = "Giá trị hàng hóa không được âm")
        Double orderValue,

        // Dịch vụ & Thanh toán
        @NotNull(message = "Vui lòng chọn loại dịch vụ")
        ServiceCode serviceCode,

        @NotNull(message = "Vui lòng chọn phương thức thanh toán")
        PaymentMethod paymentMethod,

        String paymentProvider,

        @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự")
        String note,

        MultipartFile imageFile
) {
}