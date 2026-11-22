# Smart Campus & Student Management System

Stack: Java (Spring Boot) + H2 Database + HTML/CSS/JavaScript

## GitHub Codespaces mein run karna
1. Is folder ko GitHub repo mein push karo
2. Repo > Code > Codespaces > Create codespace
3. Terminal mein: `mvn spring-boot:run`
4. Port 8080 khud khulega (ya PORTS tab se open karo)

## Demo Logins
| Role | Username | Password |
|---|---|---|
| Admin | admin | admin123 |
| HOD | hod1 | hod123 |
| Faculty | fac1 | fac123 |
| Student | stu1 | stu123 |
| Accounts | acc1 | acc123 |

Database console: `/h2-console` (JDBC URL: `jdbc:h2:file:./data/campus`, user: `sa`, password khaali)

## Extra Logins (Campus staff)
lib1/lib123, warden1/war123, trans1/tra123, store1/sto123, canteen1/can123, sports1/spo123, event1/eve123, guard1/gua123, alumni1/alu123

## Agar pehle run kiya tha
`data/` folder delete karke dobara run karo (naye tables ke liye).
