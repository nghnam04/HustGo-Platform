package vn.edu.hust.base_domain.constant;

import lombok.Getter;

@Getter
public enum HanoiDistrict {
    // 12 quận nội thành
    BA_DINH("Ba Đình", true),
    HOAN_KIEM("Hoàn Kiếm", true),
    TAY_HO("Tây Hồ", true),
    CAU_GIAY("Cầu Giấy", true),
    DONG_DA("Đống Đa", true),
    HAI_BA_TRUNG("Hai Bà Trưng", true),
    HOANG_MAI("Hoàng Mai", true),
    THANH_XUAN("Thanh Xuân", true),
    LONG_BIEN("Long Biên", true),
    NAM_TU_LIEM("Nam Từ Liêm", true),
    BAC_TU_LIEM("Bắc Từ Liêm", true),
    HA_DONG("Hà Đông", true),

    // 17 huyện & 1 thị xã ngoại thành
    BA_VI("Ba Vì", false),
    CHUONG_MY("Chương Mỹ", false),
    DAN_PHUONG("Đan Phượng", false),
    DONG_ANH("Đông Anh", false),
    GIA_LAM("Gia Lâm", false),
    HOAI_DUC("Hoài Đức", false),
    ME_LINH("Mê Linh", false),
    MY_DUC("Mỹ Đức", false),
    PHU_XUYEN("Phú Xuyên", false),
    PHUC_THO("Phúc Thọ", false),
    QUOC_OAI("Quốc Oai", false),
    SOC_SON("Sóc Sơn", false),
    THACH_THAT("Thạch Thất", false),
    THANH_OAI("Thanh Oai", false),
    THANH_TRI("Thanh Trì", false),
    THUONG_TIN("Thường Tín", false),
    UNG_HOA("Ứng Hòa", false),
    SON_TAY("Thị xã Sơn Tây", false);

    private final String displayName;
    private final boolean inner;

    HanoiDistrict(String displayName, boolean inner) {
        this.displayName = displayName;
        this.inner = inner;
    }
}