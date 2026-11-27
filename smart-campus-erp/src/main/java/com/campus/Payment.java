package com.campus;
import jakarta.persistence.*;
@Entity
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public Long feeId;
    public String feeTitle;
    public String studentUsername;
    public String studentName;
    public double amount;
    public String mode;
    public String date;
    public String receivedBy;
}
