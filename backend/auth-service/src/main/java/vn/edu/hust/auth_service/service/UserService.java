package vn.edu.hust.auth_service.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.auth_service.constant.RoleEnum;
import vn.edu.hust.auth_service.dto.UserResponse;
import vn.edu.hust.auth_service.entity.Role;
import vn.edu.hust.auth_service.entity.User;
import vn.edu.hust.auth_service.exception.HustGoException;
import vn.edu.hust.auth_service.repository.RoleRepository;
import vn.edu.hust.auth_service.repository.UserRepository;
import vn.edu.hust.base_domain.dto.PageResponse;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    
    public PageResponse<UserResponse> getAllUsers(
            int pageNo, int pageSize, String sortBy, String sortDir,
            String keyword, String roleName) {

        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name())
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        Pageable pageable = PageRequest.of(pageNo, pageSize, sort);

        Specification<User> spec = Specification.allOf();

        if (keyword != null && !keyword.isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("username")), "%" + keyword.toLowerCase() + "%"),
                    cb.like(cb.lower(root.get("email")), "%" + keyword.toLowerCase() + "%"),
                    cb.like(cb.lower(root.get("fullName")), "%" + keyword.toLowerCase() + "%")
            ));
        }

        if (roleName != null && !roleName.isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.join("roles").get("name"), RoleEnum.valueOf(roleName.toUpperCase())));
        }

        Page<User> page = userRepository.findAll(spec, pageable);

        List<UserResponse> content = page.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PageResponse<>(
                content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast()
        );
    }

    public UserResponse getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
        return mapToResponse(user);
    }

    @Transactional
    public UserResponse updateUserRoles(String id, Set<RoleEnum> roleEnums) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));

        if (user.getRoles().stream().anyMatch(r -> r.getName() == RoleEnum.SUPER_ADMIN)) {
            throw new HustGoException(HttpStatus.FORBIDDEN, "Không thể sửa đổi vai trò của Super Admin");
        }

        Set<Role> roles = roleEnums.stream()
                .map(re -> roleRepository.findByName(re)
                        .orElseThrow(() -> new RuntimeException("Role " + re + " không tồn tại")))
                .collect(Collectors.toSet());

        user.setRoles(roles);
        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));

        if (user.getRoles().stream().anyMatch(r -> r.getName() == RoleEnum.SUPER_ADMIN)) {
            throw new HustGoException(HttpStatus.FORBIDDEN, "Không thể xóa tài khoản Super Admin");
        }

        userRepository.delete(user);
    }

    private UserResponse mapToResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getRoles().stream().map(r -> r.getName().name()).collect(Collectors.toSet()),
                user.getCreatedAt()
        );
    }
}