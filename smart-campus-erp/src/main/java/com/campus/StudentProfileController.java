package com.campus;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class StudentProfileController {
    @Autowired UserRepo users;

    @GetMapping("/students/{id}")
    public Map<String, Object> get(@PathVariable Long id) {
        User u = users.findById(id).orElseThrow();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.id); m.put("username", u.username); m.put("name", u.name); m.put("department", u.department);
        m.put("admissionDate", u.admissionDate); m.put("academicSession", u.academicSession); m.put("semester", u.semester);
        m.put("fatherName", u.fatherName); m.put("motherName", u.motherName); m.put("mobile", u.mobile); m.put("email", u.email);
        m.put("guardianName", u.guardianName); m.put("parentsMobile", u.parentsMobile);
        m.put("addressCorrespondence", u.addressCorrespondence); m.put("addressPermanent", u.addressPermanent); m.put("dob", u.dob); m.put("hostelRequired", u.hostelRequired); m.put("roomNo", u.roomNo);
        m.put("photo", u.photo);
        return m;
    }

    @PutMapping("/students/{id}")
    public Map<String, Object> update(@PathVariable Long id, @RequestBody Map<String, String> b) {
        User u = users.findById(id).orElseThrow();
        if (b.containsKey("fatherName")) u.fatherName = b.get("fatherName");
        if (b.containsKey("motherName")) u.motherName = b.get("motherName");
        if (b.containsKey("mobile")) u.mobile = b.get("mobile");
        if (b.containsKey("email")) u.email = b.get("email");
        if (b.containsKey("guardianName")) u.guardianName = b.get("guardianName");
        if (b.containsKey("parentsMobile")) u.parentsMobile = b.get("parentsMobile");
        if (b.containsKey("addressCorrespondence")) u.addressCorrespondence = b.get("addressCorrespondence");
        if (b.containsKey("addressPermanent")) u.addressPermanent = b.get("addressPermanent");
        if (b.containsKey("dob")) u.dob = b.get("dob");
        if (b.containsKey("hostelRequired")) u.hostelRequired = Boolean.valueOf(b.get("hostelRequired"));
        if (b.containsKey("roomNo")) u.roomNo = b.get("roomNo");
        if (b.containsKey("photo")) u.photo = b.get("photo");
        users.save(u);
        return Map.of("ok", true);
    }
}
