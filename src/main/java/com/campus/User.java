package com.campus;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
@Entity @Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(unique = true) public String username;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) public String password;
    public String name;
    public String role;       // ADMIN, HOD, FACULTY, STUDENT, ACCOUNTS
    public String department;
}
