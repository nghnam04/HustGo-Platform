package vn.edu.hust.hub_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hust.hub_service.entity.Hub;

import java.util.Optional;

public interface HubRepository extends JpaRepository<Hub, String> {
    boolean existsByIdAndActiveTrue(String id);

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, String id);

    boolean existsByManagerId(String managerId);

    Optional<Hub> findByManagerIdAndActiveTrue(String managerId);
}
