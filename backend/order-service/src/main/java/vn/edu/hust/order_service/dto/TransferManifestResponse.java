package vn.edu.hust.order_service.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TransferManifestResponse(
        String manifestId,
        String fromHubId,
        String toHubId,
        int processedCount,
        List<String> orderIds,
        LocalDateTime createdAt
) {}