package com.campus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
@Entity @Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(unique = true) public String username;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) public String password;
    public String name;
    public String role;
    public String department;
    public Boolean mustChange;
    public String admissionDate;
    public Integer semester;
    public String academicSession;
    public String fatherName;
    public String motherName;
    public String mobile;
    public String email;
    public String guardianName;
    public String parentsMobile;
    public String addressCorrespondence;
    public String addressPermanent;
    @JsonIgnore @Column(length = 300000) public String photo;
}
