package com.campus;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class ResumeController {
    @Autowired ResumeRepo resumes;
    @Autowired UserRepo users;

    public static class ResumeReq { public Long requestId; public String student; public String fileName; public String fileType; public String content; }

    @PostMapping("/resumes")
    public ResponseEntity<?> submit(@RequestBody ResumeReq r) {
        if (r.requestId == null || r.student == null || r.content == null || r.fileName == null) return bad("Incomplete upload");
        if (r.content.length() > 1_900_000) return bad("The file is too large (maximum 1 MB)");
        User u = users.findByUsername(r.student);
        if (u == null) return bad("Student not found");
        ResumeSubmission s = null;
        for (ResumeSubmission x : resumes.findByRequestId(r.requestId)) if (r.student.equals(x.studentUsername)) s = x;
        if (s == null) s = new ResumeSubmission();
        s.requestId = r.requestId; s.studentUsername = u.username; s.studentName = u.name; s.course = u.department;
        s.fileName = r.fileName; s.fileType = r.fileType; s.content = r.content; s.submittedOn = LocalDate.now().toString();
        resumes.save(s);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/resumes")
    public List<ResumeSubmission> list(@RequestParam(required = false) Long requestId, @RequestParam(required = false) String student) {
        return resumes.findAll().stream()
            .filter(x -> requestId == null || requestId.equals(x.requestId))
            .filter(x -> student == null || student.equals(x.studentUsername))
            .collect(Collectors.toList());
    }

    @GetMapping("/resumes/{id}/file")
    public Map<String, Object> file(@PathVariable Long id) {
        ResumeSubmission s = resumes.findById(id).orElseThrow();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("fileName", s.fileName); m.put("fileType", s.fileType); m.put("content", s.content);
        return m;
    }

    private ResponseEntity<?> bad(String m) { return ResponseEntity.badRequest().body(Map.of("error", m)); }
}
