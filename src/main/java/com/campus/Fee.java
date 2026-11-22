package com.campus;
import jakarta.persistence.*;
@Entity
public class Fee {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String studentUsername;
    public String studentName;
    public String title;
    public double amount;
    public boolean paid;
}
