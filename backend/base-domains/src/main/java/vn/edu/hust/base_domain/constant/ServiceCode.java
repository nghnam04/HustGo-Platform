package vn.edu.hust.base_domain.constant;

import lombok.Getter;

@Getter
public enum ServiceCode {
    FAST("Chuyển phát nhanh"),
    ECONOMY("Chuyển phát tiết kiệm"),
    EXPRESS("Hỏa tốc");

    private final String description;

    ServiceCode(String description) {
        this.description = description;
    }
}