package com.campus;
import java.time.Year;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class UserAdminController {
    @Autowired UserRepo users;
    static final Set<String> ROLES = Set.of("HOD", "FACULTY", "STUDENT", "ACCOUNTS", "LIBRARIAN", "WARDEN", "TRANSPORT_MGR", "STORE_MGR", "CANTEEN_MGR", "SPORTS_COORD", "EVENT_COORD", "SECURITY", "ALUMNI_COORD");

    static String prefix(String role) {
        switch (role) {
            case "FACULTY": return "FAC";
            case "STUDENT": return "STU";
            case "ACCOUNTS": return "ACC";
            default: return role.substring(0, 3);
        }
    }

    @PostMapping("/users/create")
    public ResponseEntity<?> create(@RequestBody Map<String, String> b) {
        String role = b.get("role"), name = b.get("name"), pass = b.get("password");
        if (name == null || name.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Name is required"));
        if (role == null || !ROLES.contains(role)) return ResponseEntity.badRequest().body(Map.of("error", "Invalid role"));
        if (pass == null || pass.trim().length() < 4) pass = "Temp@" + (1000 + new Random().nextInt(9000));
        String base = prefix(role) + Year.now().getValue();
        int n = users.findByRole(role).size() + 1;
        String id;
        do { id = base + String.format("%03d", n++); } while (users.findByUsername(id) != null);
        User u = new User();
        u.username = id; u.password = pass.trim(); u.name = name.trim(); u.role = role;
        u.department = b.getOrDefault("department", "-"); u.mustChange = true;
        u.admissionDate = b.get("admissionDate");
        u.academicSession = b.get("academicSession");
        try { u.semester = Integer.valueOf(b.get("semester")); } catch (Exception e) { u.semester = null; }
        users.save(u);
        return ResponseEntity.ok(Map.of("username", id, "password", u.password, "name", u.name, "role", role));
    }

    @PutMapping("/users/{id}/change-password")
    public ResponseEntity<?> change(@PathVariable Long id, @RequestBody Map<String, String> b) {
        User u = users.findById(id).orElseThrow();
        String np = b.get("password");
        if (np == null || np.length() < 6) return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        if (np.equals(u.password)) return ResponseEntity.badRequest().body(Map.of("error", "New password cannot be the same as the old password"));
        u.password = np; u.mustChange = false; users.save(u);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PutMapping("/users/{id}/reset-password")
    public Map<String, Object> reset(@PathVariable Long id, @RequestBody Map<String, String> b) {
        User u = users.findById(id).orElseThrow();
        u.password = b.get("password"); u.mustChange = true; users.save(u);
        return Map.of("ok", true);
    }
}
