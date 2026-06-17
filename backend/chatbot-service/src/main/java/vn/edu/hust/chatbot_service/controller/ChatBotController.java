package vn.edu.hust.chatbot_service.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import vn.edu.hust.chatbot_service.dto.ChatRequest;
import vn.edu.hust.chatbot_service.service.ChatBotService;

import jakarta.validation.Valid;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatBotController {

    private final ChatBotService chatBotService;

    @PostMapping("/ask")
    public ResponseEntity<String> askQuestion(@Valid @RequestBody ChatRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        String username = "Khách";
        String role = "GUEST";

        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
            username = auth.getName();
            role = auth.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .collect(Collectors.joining(","));
            if (role.isEmpty()) {
                role = "ROLE_CUSTOMER";
            }
        }

        String answer = chatBotService.getResponse(request.getQuestion(), role, username);
        return ResponseEntity.ok(answer);
    }
}