package com.campus;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {
    private final UserRepo users; private final DeptRepo depts;
    public DataSeeder(UserRepo u, DeptRepo d) { users = u; depts = d; }
    public void run(String... args) {
        if (depts.count() == 0) for (String d : new String[]{"Computer Science", "Mechanical", "Electronics"}) { Department x = new Department(); x.name = d; depts.save(x); }
        add("admin", "admin123", "Administrator", "ADMIN");
        add("hod1", "hod123", "Dr. Sharma (HOD)", "HOD");
        add("fac1", "fac123", "Prof. Verma", "FACULTY");
        add("stu1", "stu123", "Rahul Kumar", "STUDENT");
        add("stu2", "stu123", "Priya Singh", "STUDENT");
        add("acc1", "acc123", "Accounts Officer", "ACCOUNTS");
        add("lib1", "lib123", "Librarian", "LIBRARIAN");
        add("warden1", "war123", "Hostel Warden", "WARDEN");
        add("trans1", "tra123", "Transport Manager", "TRANSPORT_MGR");
        add("store1", "sto123", "Store Manager", "STORE_MGR");
        add("canteen1", "can123", "Canteen Manager", "CANTEEN_MGR");
        add("sports1", "spo123", "Sports Coordinator", "SPORTS_COORD");
        add("event1", "eve123", "Event Coordinator", "EVENT_COORD");
        add("guard1", "gua123", "Security Guard", "SECURITY");
        add("alumni1", "alu123", "Alumni Coordinator", "ALUMNI_COORD");
    }
    private void add(String un, String pw, String name, String role) {
        if (users.findByUsername(un) != null) return;
        User u = new User(); u.username = un; u.password = pw; u.name = name; u.role = role;
        u.department = role.equals("HOD") || role.equals("FACULTY") || role.equals("STUDENT") ? "Computer Science" : "-";
        users.save(u);
    }
}
