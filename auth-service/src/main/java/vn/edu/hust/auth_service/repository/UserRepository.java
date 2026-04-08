package vn.edu.hust.auth_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hust.auth_service.entity.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailOrUsername(String email, String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
}
