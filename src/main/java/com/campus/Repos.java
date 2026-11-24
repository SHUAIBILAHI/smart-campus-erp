package com.campus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
interface UserRepo extends JpaRepository<User, Long> { User findByUsername(String u); List<User> findByRole(String r); }
interface DeptRepo extends JpaRepository<Department, Long> {}
interface AttRepo extends JpaRepository<Attendance, Long> { List<Attendance> findByStudentUsername(String u); }
interface LeaveRepo extends JpaRepository<LeaveRequest, Long> { List<LeaveRequest> findByApplicant(String a); List<LeaveRequest> findByApproverRole(String r); }
interface FeeRepo extends JpaRepository<Fee, Long> { List<Fee> findByStudentUsername(String u); }
interface RecRepo extends JpaRepository<Rec, Long> { List<Rec> findByModule(String m); }
interface SubjectRepo extends JpaRepository<Subject, Long> { }
