package com.campus;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class FeeController {
    @Autowired FeeRepo fees;
    @Autowired PaymentRepo payments;

    @GetMapping("/payments")
    public List<Payment> list(@RequestParam(required = false) String student) {
        return payments.findAll().stream().filter(p -> student == null || student.equals(p.studentUsername)).collect(Collectors.toList());
    }

    @PostMapping("/fees/{id}/payments")
    public ResponseEntity<?> pay(@PathVariable Long id, @RequestBody Map<String, String> b) {
        Fee f = fees.findById(id).orElseThrow();
        double amt;
        try { amt = Double.parseDouble(b.get("amount")); } catch (Exception e) { return bad("Enter a valid amount"); }
        double paid = f.paidAmount != null ? f.paidAmount : (f.paid ? f.amount : 0);
        if (amt <= 0) return bad("Amount must be more than zero");
        if (amt > f.amount - paid + 0.001) return bad("Amount is more than the pending fee");
        Payment p = new Payment();
        p.feeId = f.id; p.feeTitle = f.title; p.studentUsername = f.studentUsername; p.studentName = f.studentName;
        p.amount = amt; p.mode = b.getOrDefault("mode", "Cash"); p.date = LocalDate.now().toString(); p.receivedBy = b.getOrDefault("receivedBy", "");
        payments.save(p);
        f.paidAmount = paid + amt;
        f.paid = f.paidAmount >= f.amount - 0.001;
        fees.save(f);
        return ResponseEntity.ok(f);
    }

    private ResponseEntity<?> bad(String m) { return ResponseEntity.badRequest().body(Map.of("error", m)); }
}
