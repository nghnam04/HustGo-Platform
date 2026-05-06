package vn.edu.hust.hub_service.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.edu.hust.hub_service.entity.Hub;
import vn.edu.hust.hub_service.repository.HubRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HubService {

    private final HubRepository hubRepository;

    public boolean existsById(String id) {
        return hubRepository.existsByIdAndActiveTrue(id);
    }

    public List<Hub> getAllHubs() {
        return hubRepository.findAll();
    }

    public Hub getHubById(String id) {
        return hubRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Hub: " + id));
    }

    public Hub createHub(Hub hub) {
        hub.setActive(true);
        return hubRepository.save(hub);
    }

    public Hub updateHub(String id, Hub details) {
        Hub hub = getHubById(id);
        hub.setName(details.getName());
        hub.setCode(details.getCode());
        hub.setAddress(details.getAddress());
        hub.setDistrict(details.getDistrict());
        hub.setLat(details.getLat());
        hub.setLng(details.getLng());
        hub.setManagerId(details.getManagerId());
        return hubRepository.save(hub);
    }

    public void deleteHub(String id) {
        Hub hub = getHubById(id);
        hub.setActive(false);
        hubRepository.save(hub);
    }
}
