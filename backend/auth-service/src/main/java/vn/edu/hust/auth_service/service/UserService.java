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
import vn.edu.hust.auth_service.kafka.UserProducer;
import vn.edu.hust.auth_service.repository.RoleRepository;
import vn.edu.hust.auth_service.repository.UserRepository;
import vn.edu.hust.base_domain.dto.PageResponse;
import vn.edu.hust.base_domain.dto.UserEvent;

import java.time.LocalDateTime;
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
    private final UserProducer userProducer;          // << THÊM MỚI

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

        // << THÊM MỚI — thông báo cập nhật hồ sơ
        userProducer.publishUserEvent(new UserEvent(
                savedUser.getId(),
                savedUser.getUsername(),
                "PROFILE_UPDATED",
                savedUser.getId(),
                "Thông tin hồ sơ của bạn đã được cập nhật thành công. Nếu không phải bạn, hãy liên hệ hỗ trợ ngay",
                LocalDateTime.now()
        ));

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

        if (!passwordEncoder.matches(request.oldPassword(), user.getPassword())) {
            throw new HustGoException(HttpStatus.BAD_REQUEST, "Mật khẩu cũ không chính xác");
        }

        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new HustGoException(HttpStatus.BAD_REQUEST, "Mật khẩu mới không được trùng với mật khẩu hiện tại");
        }

        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new HustGoException(HttpStatus.BAD_REQUEST, "Xác nhận mật khẩu mới không trùng khớp");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        log.info("Người dùng với ID {} đã đổi mật khẩu thành công", userId);

        // << THÊM MỚI — thông báo đổi mật khẩu
        userProducer.publishUserEvent(new UserEvent(
                user.getId(),
                user.getUsername(),
                "PASSWORD_CHANGED",
                user.getId(),
                "Mật khẩu tài khoản của bạn vừa được thay đổi thành công. Nếu không phải bạn, hãy liên hệ hỗ trợ ngay",
                LocalDateTime.now()
        ));
    }

    public boolean isHubAdmin(String userId) {
        User user = userRepository.findById(userId).orElse(null);

        if (user == null) return false;

        return user.getRoles().stream()
                .anyMatch(role -> role.getName() == RoleEnum.HUB_ADMIN);
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
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.join("roles").get("name"), RoleEnum.valueOf(roleName.toUpperCase())));
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
    public UserResponse updateUserRoles(String id, Set<RoleEnum> roleEnums, String performedBy) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));

        if (user.getRoles().stream().anyMatch(r -> r.getName() == RoleEnum.SUPER_ADMIN)) {
            throw new HustGoException(HttpStatus.FORBIDDEN, "Không thể sửa đổi vai trò của Super Admin");
        }

        if (roleEnums.contains(RoleEnum.SUPER_ADMIN)) {
            throw new HustGoException(HttpStatus.FORBIDDEN, "Không thể cấp quyền SUPER_ADMIN");
        }

        if (roleEnums.isEmpty()) {
            throw new HustGoException(HttpStatus.BAD_REQUEST, "Người dùng phải có ít nhất một vai trò");
        }

        Set<Role> roles = roleEnums.stream()
                .map(re -> roleRepository.findByName(re)
                        .orElseThrow(() -> new RuntimeException("Role " + re + " không tồn tại")))
                .collect(Collectors.toSet());

        user.setRoles(roles);
        User saved = userRepository.save(user);

        String newRolesStr = roleEnums.stream()
                .map(RoleEnum::name)
                .collect(Collectors.joining(", "));

        userProducer.publishUserEvent(new UserEvent(
                saved.getId(),
                saved.getUsername(),
                "ROLE_UPDATED",
                performedBy,
                "Vai trò tài khoản của bạn đã được cập nhật thành: " + newRolesStr,
                LocalDateTime.now()
        ));

        userProducer.publishUserEvent(new UserEvent(
                performedBy,
                "SUPER ADMIN",
                "USER_ROLE_UPDATED",
                performedBy,
                "Bạn đã cập nhật vai trò cho user " + saved.getUsername() +
                        " thành: " + newRolesStr,
                LocalDateTime.now()
        ));

        return mapToResponse(saved);
    }

    @Transactional
    public void deleteUser(String id, String performedBy) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new HustGoException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));

        if (user.getRoles().stream().anyMatch(r -> r.getName() == RoleEnum.SUPER_ADMIN)) {
            throw new HustGoException(HttpStatus.FORBIDDEN, "Không thể xóa tài khoản Super Admin");
        }

        String username = user.getUsername();
        userRepository.delete(user);

        log.info("User {} đã bị xóa bởi {}", username, performedBy);

        userProducer.publishUserEvent(new UserEvent(
                performedBy,
                "SUPER ADMIN",
                "USER_DELETED",
                performedBy,
                "Bạn đã xóa tài khoản user: " + username,
                LocalDateTime.now()
        ));
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