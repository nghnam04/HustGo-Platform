package vn.edu.hust.auth_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hust.auth_service.constant.RoleEnum;
import vn.edu.hust.auth_service.entity.Role;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(RoleEnum name);
}
