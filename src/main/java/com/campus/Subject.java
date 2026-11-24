package com.campus;
import jakarta.persistence.*;
@Entity
public class Subject {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String course;
    public Integer semester;
    public String name;
    public String facultyUsername;
    public String facultyName;
}
