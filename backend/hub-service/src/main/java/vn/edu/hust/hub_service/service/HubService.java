package vn.edu.hust.hub_service.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import vn.edu.hust.base_domain.dto.HubEvent;
import vn.edu.hust.base_domain.dto.PageResponse;
import vn.edu.hust.hub_service.dto.HubRequest;
import vn.edu.hust.hub_service.dto.HubResponse;
import vn.edu.hust.hub_service.entity.Hub;
import vn.edu.hust.hub_service.exception.HustGoException;
import vn.edu.hust.hub_service.kafka.HubProducer;
import vn.edu.hust.hub_service.mapper.HubMapper;
import vn.edu.hust.hub_service.repository.HubRepository;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class HubService {

    private final HubRepository hubRepository;
    private final WebClient.Builder webClientBuilder;
    private final HubProducer hubProducer;

    @Value("${services.auth.url}")
    private String authServiceUrl;

    public boolean existsById(String id) {
        return hubRepository.existsByIdAndActiveTrue(id);
    }

    public String getHubDistrict(String id) {
        Hub hub = getHubEntityById(id);
        return hub.getDistrict().getDisplayName();
    }

    public String getManagerIdByHub(String hubId) {
        Hub hub = getHubEntityById(hubId);
        if (hub.getManagerId() == null) {
            throw new HustGoException(HttpStatus.NOT_FOUND, "Hub chưa được gán hub admin: " + hubId);
        }
        return hub.getManagerId();
    }

    public String getHubIdByManager(String managerId) {
        Hub hub = hubRepository.findByManagerIdAndActiveTrue(managerId)
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy hub cho manager: " + managerId));
        return hub.getId();
    }

    public PageResponse<HubResponse> getAllHubs(
            int pageNo,
            int pageSize,
            String sortBy,
            String sortDir,
            String keyword
    ) {
        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name())
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        Pageable pageable = PageRequest.of(pageNo, pageSize, sort);

        Specification<Hub> spec = Specification.allOf();

        if (keyword != null && !keyword.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")),
                            "%" + keyword.toLowerCase() + "%"),
                    cb.like(cb.lower(root.get("code")),
                            "%" + keyword.toLowerCase() + "%"),
                    cb.like(cb.lower(root.get("address")),
                            "%" + keyword.toLowerCase() + "%")
            ));
        }

        Page<Hub> page = hubRepository.findAll(spec, pageable);

        List<HubResponse> content = page.getContent()
                .stream()
                .map(HubMapper::toResponse)
                .toList();

        return new PageResponse<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast()
        );
    }

    private Hub getHubEntityById(String id) {
        return hubRepository.findById(id)
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy Hub: " + id));
    }

    public HubResponse getHubById(String id) {
        return HubMapper.toResponse(getHubEntityById(id));
    }

    public HubResponse createHub(HubRequest request, String actorId) {

        if (hubRepository.existsByCode(request.code())) {
            throw new HustGoException(HttpStatus.CONFLICT, "Mã Hub đã tồn tại " + request.code());
        }

        Hub hub = HubMapper.toEntity(request);
        Hub saved = hubRepository.save(hub);

        hubProducer.publishHubEvent(buildEvent(saved, "CREATED", actorId));

        return HubMapper.toResponse(saved);
    }

    public HubResponse assignManager(String hubId, String managerId, String actorId) {

        Hub hub = getHubEntityById(hubId);

        if (!verifyHubAdmin(managerId)) {
            throw new HustGoException(HttpStatus.BAD_REQUEST, "User không tồn tại hoặc không phải HUB_ADMIN");
        }

        if (hubRepository.existsByManagerId(managerId)) {
            throw new HustGoException(HttpStatus.CONFLICT, "Hub admin đã được gán cho hub khác");
        }

        hub.setManagerId(managerId);
        Hub saved = hubRepository.save(hub);

        hubProducer.publishHubEvent(buildEvent(saved, "MANAGER_ASSIGNED", actorId));

        return HubMapper.toResponse(saved);
    }

    public HubResponse updateHub(String id, HubRequest details, String actorId) {
        Hub hub = getHubEntityById(id);

        if (!hub.getCode().equals(details.code())) {
            if (hubRepository.existsByCodeAndIdNot(details.code(), id)) {
                throw new HustGoException(HttpStatus.CONFLICT, "Mã Hub " + details.code() + " đã tồn tại");
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

        Hub saved = hubRepository.save(hub);

        hubProducer.publishHubEvent(buildEvent(saved, "UPDATED", actorId));

        return HubMapper.toResponse(saved);
    }

    public void deleteHub(String id, String actorId) {
        Hub hub = getHubEntityById(id);
        hub.setActive(false);
        Hub saved = hubRepository.save(hub);

        hubProducer.publishHubEvent(buildEvent(saved, "DELETED", actorId));
    }

    public HubResponse getHubByManager(String managerId) {
        Hub hub = hubRepository.findByManagerIdAndActiveTrue(managerId)
                .orElseThrow(() ->
                        new HustGoException(HttpStatus.NOT_FOUND, "Hub admin chưa được gán kho"));

        return HubMapper.toResponse(hub);
    }

    // HELPERS

    private boolean verifyHubAdmin(String managerId) {
        try {
            String url = authServiceUrl + "/api/users/internal/" + managerId + "/hub-admin";
            log.info("Calling URL: {}", url);

            Boolean result = webClientBuilder.build()
                    .get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(Boolean.class)
                    .block();

            log.info("Verify result: {}", result);
            return Boolean.TRUE.equals(result);

        } catch (Exception e) {
            log.error("Lỗi xác thực Hub Admin", e);
            return false;
        }
    }

    private HubEvent buildEvent(Hub hub, String action, String actorId) {
        return new HubEvent(
                hub.getId(),
                hub.getCode(),
                hub.getName(),
                action,
                hub.getManagerId(),
                actorId,
                LocalDateTime.now()
        );
    }

    // SCHEDULER CLEANUP

    // Xoá Hub ngừng hoạt động quá 6 tháng
    @Transactional
    @Scheduled(cron = "0 30 1 * * *") // 1h30 sáng mỗi ngày
    public void cleanupInactiveHubs() {

        log.info("Bắt đầu dọn dẹp Hub không hoạt động");

        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusMonths(6);
            List<Hub> hubsToDelete = hubRepository.findByActiveFalseAndUpdatedAtBefore(cutoffDate);

            if (hubsToDelete.isEmpty()) {
                log.info("Không có Hub ngừng hoạt động nào quá 6 tháng để xóa.");
                return;
            }

            int count = hubsToDelete.size();
            hubRepository.deleteByActiveFalseAndUpdatedAtBefore(cutoffDate);
            log.info("Đã xóa {} Hub inactive quá 6 tháng", count);

        } catch (Exception e) {
            log.error("Lỗi khi cleanup Hub ngừng hoạt động", e);
        }
    }
}