package vn.edu.hust.base_domain.dto;

public record PageResponse<T>(
        java.util.List<T> content,
        int pageNo,
        int pageSize,
        long totalElements,
        int totalPages,
        boolean last
) {
}
