package com.campus;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class ApiController {
    @Autowired UserRepo users;
    @Autowired DeptRepo depts;
    @Autowired AttRepo att;
    @Autowired LeaveRepo leaves;
    @Autowired FeeRepo fees;

    // ---- Login ----
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> b) {
        User u = users.findByUsername(b.get("username"));
        if (u != null && u.password.equals(b.get("password"))) return ResponseEntity.ok(u);
        return ResponseEntity.status(401).body(Map.of("error", "Galat username ya password"));
    }

    // ---- Users (Admin / HOD / Faculty / Student / Accounts) ----
    @GetMapping("/users")
    public List<User> listUsers(@RequestParam(required = false) String role) {
        return role == null ? users.findAll() : users.findByRole(role);
    }
    @PostMapping("/users")
    public ResponseEntity<?> addUser(@RequestBody User u) {
        if (users.findByUsername(u.username) != null) return ResponseEntity.badRequest().body(Map.of("error", "Username already exists"));
        return ResponseEntity.ok(users.save(u));
    }
    @DeleteMapping("/users/{id}")
    public void delUser(@PathVariable Long id) { users.deleteById(id); }

    // ---- Departments ----
    @GetMapping("/departments") public List<Department> listDepts() { return depts.findAll(); }
    @PostMapping("/departments") public Department addDept(@RequestBody Department d) { return depts.save(d); }
    @DeleteMapping("/departments/{id}") public void delDept(@PathVariable Long id) { depts.deleteById(id); }

    // ---- Attendance ----
    @PostMapping("/attendance")
    public void markAttendance(@RequestBody List<Attendance> list) { att.saveAll(list); }
    @GetMapping("/attendance")
    public List<Attendance> getAttendance(@RequestParam String student) { return att.findByStudentUsername(student); }

    // ---- Leave Approval System ----
    @PostMapping("/leaves")
    public LeaveRequest applyLeave(@RequestBody LeaveRequest l) {
        l.approverRole = "HOD".equals(l.applicantRole) ? "ADMIN" : "HOD"; // HOD -> Admin, baaki -> HOD
        l.status = "PENDING";
        return leaves.save(l);
    }
    @GetMapping("/leaves")
    public List<LeaveRequest> getLeaves(@RequestParam(required = false) String applicant, @RequestParam(required = false) String approverRole) {
        if (applicant != null) return leaves.findByApplicant(applicant);
        return leaves.findByApproverRole(approverRole);
    }
    @PutMapping("/leaves/{id}/{status}")
    public LeaveRequest decide(@PathVariable Long id, @PathVariable String status) {
        LeaveRequest l = leaves.findById(id).orElseThrow();
        l.status = status.toUpperCase();
        return leaves.save(l);
    }

    // ---- Fees ----
    @GetMapping("/fees")
    public List<Fee> getFees(@RequestParam(required = false) String student) {
        return student == null ? fees.findAll() : fees.findByStudentUsername(student);
    }
    @PostMapping("/fees")
    public Fee addFee(@RequestBody Fee f) {
        User s = users.findByUsername(f.studentUsername);
        if (s != null) f.studentName = s.name;
        return fees.save(f);
    }
    @PutMapping("/fees/{id}/pay")
    public Fee pay(@PathVariable Long id) { Fee f = fees.findById(id).orElseThrow(); f.paid = true; return fees.save(f); }

    // ---- Dashboard stats ----
    @GetMapping("/stats")
    public Map<String, Object> stats() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("Students", users.findByRole("STUDENT").size());
        m.put("Faculty", users.findByRole("FACULTY").size());
        m.put("HODs", users.findByRole("HOD").size());
        m.put("Departments", depts.count());
        m.put("Pending Leaves", leaves.findAll().stream().filter(l -> "PENDING".equals(l.status)).count());
        m.put("Fees Due", fees.findAll().stream().filter(f -> !f.paid).count());
        return m;
    }
}
