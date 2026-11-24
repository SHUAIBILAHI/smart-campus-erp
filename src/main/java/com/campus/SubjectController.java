package com.campus;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class SubjectController {
    @Autowired SubjectRepo subjects;

    public static class BulkReq { public String course; public Integer semester; public List<String> names; }

    @GetMapping("/subjects")
    public List<Subject> list(@RequestParam(required = false) String course, @RequestParam(required = false) Integer semester) {
        return subjects.findAll().stream()
            .filter(s -> (course == null || course.equals(s.course)) && (semester == null || semester.equals(s.semester)))
            .sorted(Comparator.comparing((Subject s) -> s.semester == null ? 0 : s.semester).thenComparing(s -> s.name == null ? "" : s.name))
            .collect(Collectors.toList());
    }

    // HOD submits all subjects of one semester; they apply to every student of that semester
    @PostMapping("/subjects/bulk")
    public Map<String, Object> bulk(@RequestBody BulkReq r) {
        List<Subject> existing = subjects.findAll().stream().filter(s -> r.course.equals(s.course) && r.semester.equals(s.semester)).collect(Collectors.toList());
        Set<String> want = new LinkedHashSet<>();
        for (String n : r.names) if (n != null && !n.isBlank()) want.add(n.trim());
        for (Subject s : existing) if (!want.contains(s.name)) subjects.delete(s);
        Set<String> have = existing.stream().map(s -> s.name).collect(Collectors.toSet());
        for (String n : want) if (!have.contains(n)) {
            Subject s = new Subject(); s.course = r.course; s.semester = r.semester; s.name = n; subjects.save(s);
        }
        return Map.of("ok", true);
    }

    @PutMapping("/subjects/{id}/faculty")
    public Subject assign(@PathVariable Long id, @RequestBody Map<String, String> b) {
        Subject s = subjects.findById(id).orElseThrow();
        String u = b.get("facultyUsername");
        boolean none = u == null || u.isBlank();
        s.facultyUsername = none ? null : u;
        s.facultyName = none ? null : b.get("facultyName");
        return subjects.save(s);
    }

    @DeleteMapping("/subjects/{id}")
    public void del(@PathVariable Long id) { subjects.deleteById(id); }
}
