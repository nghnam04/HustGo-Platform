package vn.edu.hust.order_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.order_service.entity.TransferManifest;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransferManifestRepository extends JpaRepository<TransferManifest, String> {
    List<TransferManifest> findByCreatedAtBefore(LocalDateTime cutoffDate);
}