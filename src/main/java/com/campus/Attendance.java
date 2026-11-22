package com.campus;
import jakarta.persistence.*;
@Entity
public class Attendance {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String studentUsername;
    public String studentName;
    public String subject;
    public String date;
    public boolean present;
}
