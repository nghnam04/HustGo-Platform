package vn.edu.hust.auth_service.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.auth_service.constant.RoleEnum;
import vn.edu.hust.auth_service.dto.ChangePasswordRequest;
import vn.edu.hust.auth_service.dto.UpdateProfileRequest;
import vn.edu.hust.auth_service.dto.UserProfileResponse;
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
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CloudinaryService cloudinaryService;
    private final PasswordEncoder passwordEncoder;

    public UserProfileResponse getMyProfile(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng với ID: " + userId));

        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getRoles().stream()
                        .map(role -> role.getName().name())
                        .collect(Collectors.toSet()),
                user.getCreatedAt()
        );
    }

    @Transactional
    public UserProfileResponse updateMyProfile(String userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng với ID: " + userId));

        if (!user.getEmail().equalsIgnoreCase(request.email()) && userRepository.existsByEmail(request.email())) {
            throw new HustGoException(HttpStatus.BAD_REQUEST, "Email này đã được sử dụng bởi một tài khoản khác");
        }

        if (request.avatarFile() != null && !request.avatarFile().isEmpty()) {
            try {
                String newAvatarUrl = cloudinaryService.uploadImage(request.avatarFile());
                user.setAvatarUrl(newAvatarUrl);
                log.info("Đã cập nhật ảnh đại diện mới cho user {}: {}", userId, newAvatarUrl);
            } catch (Exception e) {
                log.error("Lỗi khi upload avatar lên Cloudinary cho user {}: {}", userId, e.getMessage());
                throw new HustGoException(HttpStatus.BAD_REQUEST, "Không thể tải ảnh đại diện lên hệ thống. Vui lòng thử lại!");
            }
        }

        user.setFullName(request.fullName());
        user.setEmail(request.email());

        User savedUser = userRepository.save(user);

        Set<String> mappedRoles = savedUser.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toSet());

        return new UserProfileResponse(
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getFullName(),
                savedUser.getEmail(),
                savedUser.getAvatarUrl(),
                mappedRoles,
                savedUser.getCreatedAt()
        );
    }

    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng với ID: " + userId));

        // Kiểm tra mật khẩu cũ
        if (!passwordEncoder.matches(request.oldPassword(), user.getPassword())) {
            throw new HustGoException(HttpStatus.BAD_REQUEST, "Mật khẩu cũ không chính xác");
        }

        // Kiểm tra mật khẩu mới không được trùng mật khẩu cũ
        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new HustGoException(HttpStatus.BAD_REQUEST, "Mật khẩu mới không được trùng với mật khẩu hiện tại");
        }

        // Kiểm tra mật khẩu mới và xác nhận mật khẩu có trùng nhau không
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new HustGoException(HttpStatus.BAD_REQUEST, "Xác nhận mật khẩu mới không trùng khớp");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        log.info("Người dùng với ID {} đã đổi mật khẩu thành công", userId);
    }

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