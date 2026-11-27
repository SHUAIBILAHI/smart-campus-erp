package com.campus;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class PromotionController {
    @Autowired UserRepo users;
    @Autowired SubjectRepo subjects;
    @Autowired MarkRepo marks;
    @Autowired FeeRepo fees;
    @Autowired DeptRepo depts;

    public static class PromoteReq { public Integer semester; public List<String> usernames; }

    private Department findDept(String name) {
        for (Department d : depts.findAll()) if (Objects.equals(d.name, name)) return d;
        return null;
    }

    // true when every subject of the semester has verified internal and external marks
    private boolean semesterMarksOk(String course, int sem, List<Mark> all) {
        List<Mark> mine = all.stream().filter(m -> m.semester != null && m.semester == sem && "VERIFIED".equals(m.status)).collect(Collectors.toList());
        List<String> names = subjects.findAll().stream()
            .filter(s -> course.equals(s.course) && s.semester != null && s.semester == sem)
            .map(s -> s.name).collect(Collectors.toList());
        if (names.isEmpty()) {
            boolean in = mine.stream().anyMatch(m -> m.component.startsWith("INTERNAL_"));
            boolean ex = mine.stream().anyMatch(m -> m.component.startsWith("EXTERNAL_"));
            return in && ex;
        }
        for (String n : names) {
            boolean in = mine.stream().anyMatch(m -> n.equals(m.subject) && m.component.startsWith("INTERNAL_"));
            boolean ex = mine.stream().anyMatch(m -> n.equals(m.subject) && m.component.startsWith("EXTERNAL_"));
            if (!in || !ex) return false;
        }
        return true;
    }

    private Map<String, Object> check(User u, Department d) {
        List<String> reasons = new ArrayList<>();
        int k = u.semester == null ? 0 : u.semester;
        List<Mark> all = marks.findByStudentUsername(u.username);
        boolean last = d != null && d.semesters != null && k >= d.semesters;
        boolean yearEnd = k > 0 && k % 2 == 0;
        boolean marksOk = k > 0 && semesterMarksOk(u.department, k, all);
        if (yearEnd && k > 1 && !semesterMarksOk(u.department, k - 1, all)) marksOk = false;
        int year = (k + 1) / 2;
        boolean feeClear = true;
        for (Fee f : fees.findByStudentUsername(u.username)) {
            if (f.year != null && f.year > year) continue;
            double paid = f.paidAmount != null ? f.paidAmount : (f.paid ? f.amount : 0);
            if (paid < f.amount - 0.001) feeClear = false;
        }
        if (k == 0) reasons.add("Semester is not set");
        if (last) reasons.add("Final semester: course completed");
        if (k > 0 && !marksOk) reasons.add("Verified internal + external marks are missing" + (yearEnd ? " (both semesters of the year are needed)" : ""));
        if (yearEnd && !feeClear) reasons.add("Fee is not cleared");
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("username", u.username); r.put("name", u.name); r.put("academicSession", u.academicSession); r.put("semester", u.semester);
        r.put("marksOk", marksOk); r.put("yearEnd", yearEnd); r.put("feeClear", feeClear);
        r.put("eligible", reasons.isEmpty()); r.put("reasons", reasons);
        return r;
    }

    @GetMapping("/promotion/preview")
    public List<Map<String, Object>> preview(@RequestParam String course, @RequestParam Integer semester) {
        Department d = findDept(course);
        List<Map<String, Object>> out = new ArrayList<>();
        for (User u : users.findByRole("STUDENT"))
            if (course.equals(u.department) && semester.equals(u.semester)) out.add(check(u, d));
        return out;
    }

    // The rules are checked again here, so only eligible students are ever promoted
    @PostMapping("/promotion/promote")
    public Map<String, Object> promote(@RequestBody PromoteReq r) {
        int promoted = 0;
        List<Map<String, Object>> skipped = new ArrayList<>();
        for (String name : r.usernames) {
            User u = users.findByUsername(name);
            if (u == null || u.semester == null || !u.semester.equals(r.semester)) {
                Map<String, Object> s = new LinkedHashMap<>();
                s.put("username", String.valueOf(name)); s.put("reasons", List.of("Student not found or already moved"));
                skipped.add(s);
                continue;
            }
            Department d = findDept(u.department);
            Map<String, Object> c = check(u, d);
            if (!Boolean.TRUE.equals(c.get("eligible"))) {
                Map<String, Object> s = new LinkedHashMap<>();
                s.put("username", u.username); s.put("reasons", c.get("reasons"));
                skipped.add(s);
                continue;
            }
            int next = u.semester + 1;
            u.semester = next;
            users.save(u);
            promoted++;
            if (next % 2 == 1 && d != null && d.feePerYear != null && d.feePerYear > 0) {
                int year = (next + 1) / 2;
                boolean has = false;
                for (Fee old : fees.findByStudentUsername(u.username)) if (old.year != null && old.year == year) has = true;
                if (!has) {
                    Fee f = new Fee();
                    f.studentUsername = u.username; f.studentName = u.name; f.year = year;
                    f.title = "Year " + year + " Tuition Fee"; f.amount = d.feePerYear; f.paidAmount = 0.0; f.paid = false;
                    f.dueDate = LocalDate.now().plusDays(30).toString();
                    fees.save(f);
                }
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("promoted", promoted); out.put("skipped", skipped);
        return out;
    }
}
