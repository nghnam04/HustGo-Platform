package vn.edu.hust.hub_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hust.hub_service.entity.Hub;

import java.util.List;

public interface HubRepository extends JpaRepository<Hub, String> {
    boolean existsByIdAndActiveTrue(String id);

    List<Hub> findByActiveTrue();
}
