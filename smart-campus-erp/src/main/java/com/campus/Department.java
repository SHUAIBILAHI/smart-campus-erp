package com.campus;
import jakarta.persistence.*;
@Entity
public class Department {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String name;
    public Double durationYears;
    public Integer semesters;
    public Double feePerYear;
}
