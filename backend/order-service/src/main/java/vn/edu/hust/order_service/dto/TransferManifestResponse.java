package vn.edu.hust.order_service.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TransferManifestResponse(
        String manifestId,
        String fromHubId,
        String fromHubName,
        String toHubId,
        String toHubName,
        int processedCount,
        List<String> orderIds,
        LocalDateTime createdAt
) {}