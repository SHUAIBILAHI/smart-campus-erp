package com.campus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
@Entity
public class ResumeSubmission {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public Long requestId;
    public String studentUsername;
    public String studentName;
    public String course;
    public String fileName;
    public String fileType;
    public String submittedOn;
    @JsonIgnore @Column(length = 2000000) public String content;
}
