package com.campus;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class RecordController {
    @Autowired RecRepo recs; @Autowired UserRepo users; @Autowired AttRepo att; @Autowired FeeRepo fees; @Autowired LeaveRepo leaves;
    ObjectMapper om = new ObjectMapper();
    Map<String, String[]> codes = new HashMap<>();
    static final Set<String> SEARCHABLE = Set.of("Notice", "Material", "Job", "Internship", "Drive", "Event", "Sports", "Transport", "Canteen", "Nav", "LostFound", "Subject", "Class");

    void audit(String owner, String text) {
        try {
            Rec a = new Rec(); a.module = "Audit"; a.owner = owner;
            User u = users.findByUsername(owner);
            a.ownerName = u == null ? owner : u.name; a.ownerRole = u == null ? "" : u.role;
            a.data = om.writeValueAsString(Map.of("action", text)); a.status = "OK"; a.createdAt = LocalDateTime.now().toString();
            recs.save(a);
        } catch (Exception e) { }
    }

    // ---- Generic records (used by all modules) ----
    @GetMapping("/records") public List<Rec> list(@RequestParam String module) { return recs.findByModule(module); }
    @PostMapping("/records") public Rec add(@RequestBody Rec r) {
        r.id = null; r.status = "PENDING"; r.createdAt = LocalDateTime.now().toString();
        Rec s = recs.save(r);
        if (!"Msg".equals(r.module)) audit(r.owner, "Added record in " + r.module);
        return s;
    }
    @DeleteMapping("/records/{id}") public void del(@PathVariable Long id) { recs.deleteById(id); }
    @PutMapping("/records/{id}/status/{s}") public Rec status(@PathVariable Long id, @PathVariable String s) {
        Rec r = recs.findById(id).orElseThrow(); r.status = s.toUpperCase();
        audit(r.owner, "Your " + r.module + " request was " + r.status);
        return recs.save(r);
    }
    @PostMapping("/audit") public void aud(@RequestBody Map<String, String> b) { audit(b.get("owner"), b.get("text")); }
    @GetMapping("/attendance/all") public List<Attendance> allAtt() { return att.findAll(); }

    // ---- Password / Forgot ----
    @PutMapping("/users/{id}/password") public Map<String, Object> pw(@PathVariable Long id, @RequestBody Map<String, String> b) {
        User u = users.findById(id).orElseThrow(); u.password = b.get("password"); users.save(u); return Map.of("ok", true);
    }
    @PostMapping("/forgot") public ResponseEntity<?> forgot(@RequestBody Map<String, String> b) {
        User u = users.findByUsername(b.get("username"));
        if (u == null || b.get("name") == null || !u.name.equalsIgnoreCase(b.get("name").trim()))
            return ResponseEntity.badRequest().body(Map.of("error", "Details do not match"));
        u.password = b.get("newPassword"); users.save(u); audit(u.username, "Password reset (forgot password)");
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ---- QR / Code attendance ----
    @PostMapping("/qr/new") public Map<String, String> qrNew(@RequestBody Map<String, String> b) {
        String c = String.valueOf(100000 + new Random().nextInt(900000));
        codes.put(c, new String[]{b.getOrDefault("subject", "General"), String.valueOf(System.currentTimeMillis() + 600000)});
        return Map.of("code", c);
    }
    @PostMapping("/qr/mark") public ResponseEntity<?> qrMark(@RequestBody Map<String, String> b) {
        String[] c = codes.get(b.get("code"));
        if (c == null || Long.parseLong(c[1]) < System.currentTimeMillis()) return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired code"));
        User u = users.findByUsername(b.get("username"));
        Attendance a = new Attendance(); a.studentUsername = u.username; a.studentName = u.name; a.subject = c[0];
        a.date = java.time.LocalDate.now().toString(); a.present = true; att.save(a);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    // ---- Smart Search ----
    @GetMapping("/search") public List<Map<String, String>> search(@RequestParam String q) {
        String s = q.toLowerCase(); List<Map<String, String>> out = new ArrayList<>();
        for (User u : users.findAll())
            if ((u.name + " " + u.username + " " + u.department + " " + u.role).toLowerCase().contains(s))
                out.add(Map.of("type", u.role, "text", u.name + " (" + u.username + ") - " + u.department));
        for (Rec r : recs.findAll())
            if (SEARCHABLE.contains(r.module) && r.data.toLowerCase().contains(s))
                out.add(Map.of("type", r.module, "text", r.data.replaceAll("[{}\"]", "")));
        return out.stream().limit(50).toList();
    }

    // ---- AI College Assistant (rule-based) ----
    @PostMapping("/chat") public Map<String, String> chat(@RequestBody Map<String, String> b) {
        String u = b.get("username"), m = b.getOrDefault("message", "").toLowerCase(), r;
        if (m.contains("attend")) {
            List<Attendance> a = att.findByStudentUsername(u); long p = a.stream().filter(x -> x.present).count();
            r = a.isEmpty() ? "No attendance has been recorded for you yet." : "Your attendance is " + (p * 100 / a.size()) + "% (" + p + "/" + a.size() + " classes)." + (p * 100 / a.size() < 75 ? " ⚠️ This is below 75%. Please attend classes regularly." : "");
        } else if (m.contains("fee")) {
            List<Fee> d = fees.findByStudentUsername(u).stream().filter(x -> !x.paid).toList();
            r = d.isEmpty() ? "You have no pending fees ✅" : d.size() + " pending fee(s), total ₹" + (long) d.stream().mapToDouble(x -> x.amount).sum() + ". Pay under 'Fee Details & Payment'.";
        } else if (m.contains("leave")) {
            long p = leaves.findByApplicant(u).stream().filter(x -> "PENDING".equals(x.status)).count();
            r = "You have " + p + " leave request(s) pending. To apply for leave, open 'Apply for Leave'.";
        } else if (m.contains("exam") || m.contains("test")) r = "Tests are available under 'Online Examination'.";
        else if (m.contains("result") || m.contains("mark")) r = "View your marks under 'Results & Marksheet'.";
        else if (m.contains("placement") || m.contains("job") || m.contains("intern")) r = "Job Opportunities, Internship Opportunities and Placement Drives are published in the Placement section.";
        else if (m.contains("library") || m.contains("book")) r = "Your issued books are shown under 'Library Management'.";
        else if (m.contains("hello") || m.equals("hi")) r = "Hello! I am your College Assistant 🙂";
        else r = "I can help with attendance, fees, leave, exams, results, placements and the library.";
        return Map.of("reply", r);
    }
}
