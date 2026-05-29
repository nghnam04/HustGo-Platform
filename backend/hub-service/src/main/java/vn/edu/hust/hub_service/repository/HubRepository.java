package vn.edu.hust.hub_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import vn.edu.hust.hub_service.entity.Hub;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface HubRepository extends JpaRepository<Hub, String>, JpaSpecificationExecutor<Hub> {
    boolean existsByIdAndActiveTrue(String id);

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, String id);

    boolean existsByManagerId(String managerId);

    Optional<Hub> findByManagerIdAndActiveTrue(String managerId);

    List<Hub> findByActiveFalseAndUpdatedAtBefore(LocalDateTime cutoffDate);

    void deleteByActiveFalseAndUpdatedAtBefore(LocalDateTime cutoffDate);
}
