package vn.edu.hust.base_domain.constant;

import lombok.Getter;

import java.util.Arrays;

@Getter
public enum HanoiDistrict {
    // 12 quận nội thanhf
    BA_DINH("Quận Ba Đình", true),
    HOAN_KIEM("Quận Hoàn Kiếm", true),
    TAY_HO("Quận Tây Hồ", true),
    CAU_GIAY("Quận Cầu Giấy", true),
    DONG_DA("Quận Đống Đa", true),
    HAI_BA_TRUNG("Quận Hai Bà Trưng", true),
    HOANG_MAI("Quận Hoàng Mai", true),
    THANH_XUAN("Quận Thanh Xuân", true),
    LONG_BIEN("Quận Long Biên", true),
    NAM_TU_LIEM("Quận Nam Từ Liêm", true),
    BAC_TU_LIEM("Quận Bắc Từ Liêm", true),
    HA_DONG("Quận Hà Đông", true),

    // 17 huyện & 1 thị xã ngoại thành
    BA_VI("Huyện Ba Vì", false),
    CHUONG_MY("Huyện Chương Mỹ", false),
    DAN_PHUONG("Huyện Đan Phượng", false),
    DONG_ANH("Huyện Đông Anh", false),
    GIA_LAM("Huyện Gia Lâm", false),
    HOAI_DUC("Huyện Hoài Đức", false),
    ME_LINH("Huyện Mê Linh", false),
    MY_DUC("Huyện Mỹ Đức", false),
    PHU_XUYEN("Huyện Phú Xuyên", false),
    PHUC_THO("Huyện Phúc Thọ", false),
    QUOC_OAI("Huyện Quốc Oai", false),
    SOC_SON("Huyện Sóc Sơn", false),
    THACH_THAT("Huyện Thạch Thất", false),
    THANH_OAI("Huyện Thanh Oai", false),
    THANH_TRI("Huyện Thanh Trì", false),
    THUONG_TIN("Huyện Thường Tín", false),
    UNG_HOA("Huyện Ứng Hòa", false),
    SON_TAY("Thị xã Sơn Tây", false);

    private final String displayName;
    private final boolean inner;

    HanoiDistrict(String displayName, boolean inner) {
        this.displayName = displayName;
        this.inner = inner;
    }

    public static HanoiDistrict fromName(String name) {
        if (name == null) return null;
        return Arrays.stream(values())
                .filter(d -> d.displayName.equalsIgnoreCase(name)
                        || d.name().equalsIgnoreCase(name)
                        || name.toLowerCase().contains(d.displayName.toLowerCase().replace("quận ", "").replace("huyện ", "")))
                .findFirst()
                .orElse(null);
    }
}
