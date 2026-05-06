package vn.edu.hust.hub_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hust.hub_service.entity.Hub;

public interface HubRepository extends JpaRepository<Hub, String> {
    boolean existsByIdAndActiveTrue(String id);

    boolean existsByCodeAndIdNot(String code, String id);
}
