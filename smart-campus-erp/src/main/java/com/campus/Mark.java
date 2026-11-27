package com.campus;
import jakarta.persistence.*;
@Entity
public class Mark {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String studentUsername;
    public String studentName;
    public String course;
    public Integer semester;
    public String subject;
    public String component;   // INTERNAL_THEORY, INTERNAL_PRACTICAL, EXTERNAL_THEORY, EXTERNAL_PRACTICAL
    public Double marks;
    public Double maxMarks;
    public String enteredBy;
    public String status = "PENDING";   // PENDING, VERIFIED, REJECTED
    public String createdAt;
}
