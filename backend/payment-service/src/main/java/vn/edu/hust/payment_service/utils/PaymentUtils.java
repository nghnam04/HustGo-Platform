package vn.edu.hust.payment_service.utils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Formatter;

public class PaymentUtils {
    // Tạo chữ ký số
    public static String hmacSHA256(String data, String key) {
        try {
            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");

            // tạo secret key từ chuỗi key
            SecretKeySpec secret_key = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");

            // gắn key vào hmac
            sha256_HMAC.init(secret_key);
            byte[] hash = sha256_HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));

            // chuyển byte[] thành chuỗi hex
            Formatter formatter = new Formatter();
            for (byte b : hash) {
                formatter.format("%02x", b);
            }
            String result = formatter.toString();
            formatter.close();
            return result;
        } catch (Exception e) {
            return "";
        }
    }
}