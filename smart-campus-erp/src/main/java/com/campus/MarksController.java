package com.campus;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class MarksController {
    @Autowired MarkRepo marks;
    @Autowired UserRepo users;

    public static class MarkEntry { public String student; public Integer semester; public String subject; public String component; public Double marks; public Double max; }
    public static class Upload { public String byRole; public String byUser; public List<MarkEntry> entries; }
    public static class StatusReq { public List<Long> ids; public String status; }

    @GetMapping("/marks")
    public List<Mark> list(@RequestParam(required = false) String student, @RequestParam(required = false) String course,
                           @RequestParam(required = false) Integer semester, @RequestParam(required = false) String kind) {
        return marks.findAll().stream()
            .filter(m -> student == null || student.equals(m.studentUsername))
            .filter(m -> course == null || course.equals(m.course))
            .filter(m -> semester == null || semester.equals(m.semester))
            .filter(m -> kind == null || (m.component != null && m.component.startsWith(kind)))
            .collect(Collectors.toList());
    }

    // Faculty uploads INTERNAL marks, students upload EXTERNAL marks. Everything starts as PENDING until the HOD verifies it.
    @PostMapping("/marks")
    public ResponseEntity<?> upload(@RequestBody Upload up) {
        if (up.entries == null || up.entries.isEmpty()) return bad("Nothing to save");
        boolean student = "STUDENT".equals(up.byRole), faculty = "FACULTY".equals(up.byRole);
        if (!student && !faculty) return bad("Only faculty (internal) and students (external) can upload marks");
        List<Mark> toSave = new ArrayList<>();
        for (MarkEntry e : up.entries) {
            if (e.student == null || e.semester == null || e.subject == null || e.component == null || e.marks == null || e.max == null) return bad("Incomplete entry");
            boolean internal = e.component.startsWith("INTERNAL_"), external = e.component.startsWith("EXTERNAL_");
            if (!internal && !external) return bad("Unknown mark type");
            if (internal && !faculty) return bad("Internal marks are entered by faculty");
            if (external && !student) return bad("External marks are entered by the student");
            if (student && !e.student.equals(up.byUser)) return bad("You can upload only your own marks");
            if (e.max <= 0 || e.marks < 0 || e.marks > e.max) return bad("Marks must be between 0 and the maximum (" + e.subject + ")");
            User u = users.findByUsername(e.student);
            if (u == null) return bad("Student not found");
            Mark existing = null;
            for (Mark m : marks.findByStudentUsername(e.student))
                if (e.semester.equals(m.semester) && e.subject.equals(m.subject) && e.component.equals(m.component)) existing = m;
            if (existing != null) {
                if ("VERIFIED".equals(existing.status)) return bad("Already verified: " + e.subject);
                if (external && !"REJECTED".equals(existing.status)) return bad("You have already submitted these marks: " + e.subject);
            }
            Mark m = existing != null ? existing : new Mark();
            m.studentUsername = u.username; m.studentName = u.name; m.course = u.department;
            m.semester = e.semester; m.subject = e.subject; m.component = e.component;
            m.marks = e.marks; m.maxMarks = e.max; m.enteredBy = up.byUser; m.status = "PENDING"; m.createdAt = LocalDate.now().toString();
            toSave.add(m);
        }
        marks.saveAll(toSave);
        return ResponseEntity.ok(Map.of("saved", toSave.size()));
    }

    // HOD verifies or rejects a group of entries
    @PutMapping("/marks/status")
    public ResponseEntity<?> status(@RequestBody StatusReq r) {
        if (r.ids == null || (!"VERIFIED".equals(r.status) && !"REJECTED".equals(r.status))) return bad("Invalid request");
        List<Mark> ms = marks.findAllById(r.ids);
        for (Mark m : ms) m.status = r.status;
        marks.saveAll(ms);
        return ResponseEntity.ok(Map.of("updated", ms.size()));
    }

    private ResponseEntity<?> bad(String s) { return ResponseEntity.badRequest().body(Map.of("error", s)); }
}
