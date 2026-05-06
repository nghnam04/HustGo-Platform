package vn.edu.hust.hub_service.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.edu.hust.hub_service.dto.HubRequest;
import vn.edu.hust.hub_service.dto.HubResponse;
import vn.edu.hust.hub_service.entity.Hub;
import vn.edu.hust.hub_service.mapper.HubMapper;
import vn.edu.hust.hub_service.repository.HubRepository;

import java.util.List;
import java.util.stream.Collectors;

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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Hub: " + id));
    }

    public HubResponse getHubById(String id) {
        return HubMapper.toResponse(getHubEntityById(id));
    }

    public HubResponse createHub(HubRequest request) {
        Hub hub = HubMapper.toEntity(request);
        hub.setActive(true);
        return HubMapper.toResponse(hubRepository.save(hub));
    }

    public HubResponse updateHub(String id, HubRequest details) {
        Hub hub = getHubEntityById(id);

        hub.setName(details.name());
        hub.setCode(details.code());
        hub.setAddress(details.address());
        hub.setDistrict(details.district());
        hub.setLat(details.lat());
        hub.setLng(details.lng());
        hub.setManagerId(details.managerId());

        return HubMapper.toResponse(hubRepository.save(hub));
    }

    public void deleteHub(String id) {
        Hub hub = getHubEntityById(id);
        hub.setActive(false);
        hubRepository.save(hub);
    }
}