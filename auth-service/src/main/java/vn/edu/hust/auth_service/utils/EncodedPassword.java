package vn.edu.hust.auth_service.utils;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class EncodedPassword {
    public static void main(String[] args) {
        System.out.println(new BCryptPasswordEncoder().encode("nam123456"));
    }
}
