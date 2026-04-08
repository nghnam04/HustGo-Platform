package vn.edu.hust.auth_service.entity;

import jakarta.persistence.*;
import lombok.*;
import vn.edu.hust.auth_service.constant.AuthProvider;
import vn.edu.hust.auth_service.constant.RoleEnum;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String email;
    @Column(unique = true, nullable = false)
    private String username;

    private String password; // Nullable đối với Google/Facebook login
    private String fullName;
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    private AuthProvider provider;
    private String providerId; // ID trả về từ Google/Facebook

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
