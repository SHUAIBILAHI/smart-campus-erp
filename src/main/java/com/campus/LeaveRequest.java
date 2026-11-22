package com.campus;
import jakarta.persistence.*;
@Entity
public class LeaveRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String applicant;
    public String applicantName;
    public String applicantRole;
    public String approverRole;  // HOD ya ADMIN (server set karta hai)
    public String reason;
    public String fromDate;
    public String toDate;
    public String status = "PENDING"; // PENDING, APPROVED, REJECTED
}
