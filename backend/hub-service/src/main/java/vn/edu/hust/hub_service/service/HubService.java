package vn.edu.hust.hub_service.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import vn.edu.hust.hub_service.dto.HubRequest;
import vn.edu.hust.hub_service.dto.HubResponse;
import vn.edu.hust.hub_service.entity.Hub;
import vn.edu.hust.hub_service.exception.HustGoException;
import vn.edu.hust.hub_service.mapper.HubMapper;
import vn.edu.hust.hub_service.repository.HubRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class HubService {

    private final HubRepository hubRepository;

    public boolean existsById(String id) {
        return hubRepository.existsByIdAndActiveTrue(id);
    }

    public List<HubResponse> getAllHubs() {
        return hubRepository.findAll().stream()
                .map(HubMapper::toResponse)
                .collect(Collectors.toList());
    }

    private Hub getHubEntityById(String id) {
        return hubRepository.findById(id)
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy Hub: " + id));
    }

    public HubResponse getHubById(String id) {
        return HubMapper.toResponse(getHubEntityById(id));
    }

    public HubResponse createHub(HubRequest request) {

        if (hubRepository.existsByCode(request.code())) {
            throw new HustGoException(HttpStatus.CONFLICT, "Mã Hub đã tồn tại " + request.code());
        }

        Hub hub = HubMapper.toEntity(request);

        return HubMapper.toResponse(hubRepository.save(hub));
    }

    public HubResponse assignManager(String hubId, String managerId) {

        Hub hub = getHubEntityById(hubId);

        if (hubRepository.existsByManagerId(managerId)) {
            throw new HustGoException(HttpStatus.CONFLICT, "Hub admin đã được gán cho hub khác");
        }

        hub.setManagerId(managerId);

        return HubMapper.toResponse(hubRepository.save(hub));
    }

    public HubResponse updateHub(String id, HubRequest details) {
        Hub hub = getHubEntityById(id);

        if (!hub.getCode().equals(details.code())) {
            if (hubRepository.existsByCodeAndIdNot(details.code(), id)) {
                throw new HustGoException(HttpStatus.CONFLICT, "Mã Hub " + details.code() + " đã tồn tại ở một Hub khác!");
            }
            hub.setCode(details.code());
        }

        hub.setName(details.name());
        hub.setAddress(details.address());
        hub.setWard(details.ward());
        hub.setDistrict(details.district());
        hub.setProvince(details.province());
        hub.setLat(details.lat());
        hub.setLng(details.lng());
        hub.setActive(details.active());

        return HubMapper.toResponse(hubRepository.save(hub));
    }

    public void deleteHub(String id) {
        Hub hub = getHubEntityById(id);
        hub.setActive(false);
        hubRepository.save(hub);
    }

    public HubResponse getHubByManager(String managerId) {

        Hub hub = hubRepository.findByManagerIdAndActiveTrue(managerId)
                .orElseThrow(() ->
                        new HustGoException(HttpStatus.NOT_FOUND, "Hub admin chưa được gán kho"));

        return HubMapper.toResponse(hub);
    }

    // ================= SCHEDULE CLEANUP =================
    @Transactional
    @Scheduled(cron = "0 30 1 * * *") // 1h30 sáng mỗi ngày
    public void cleanupInactiveHubs() {

        log.info("Bắt đầu dọn dẹp Hub không hoạt động");

        try {

            // Hub inactive quá 6 tháng
            LocalDateTime cutoffDate = LocalDateTime.now().minusMonths(6);

            List<Hub> hubsToDelete =
                    hubRepository.findByActiveFalseAndUpdatedAtBefore(cutoffDate);

            if (hubsToDelete.isEmpty()) {
                log.info("Không có Hub inactive nào quá 6 tháng để xóa.");
                return;
            }

            int count = hubsToDelete.size();

            hubRepository.deleteByActiveFalseAndUpdatedAtBefore(cutoffDate);

            log.info("Đã xóa {} Hub inactive quá 6 tháng", count);

        } catch (Exception e) {

            log.error("Lỗi khi cleanup Hub inactive", e);
        }
    }
}