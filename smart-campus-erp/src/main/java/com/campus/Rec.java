package com.campus;
import jakarta.persistence.*;
@Entity @Table(name = "records")
public class Rec {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String module;
    public String owner;
    public String ownerName;
    public String ownerRole;
    @Column(length = 4000) public String data;   // JSON string of form fields
    public String status = "PENDING";
    public String createdAt;
}
