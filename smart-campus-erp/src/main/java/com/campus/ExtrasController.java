package com.campus;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
public class ExtrasController {
    @Autowired RecRepo recs;

    // update the JSON data of a record (used for library issue / return dates)
    @PutMapping("/records/{id}/data")
    public Rec setData(@PathVariable Long id, @RequestBody Map<String, String> b) {
        Rec r = recs.findById(id).orElseThrow();
        r.data = b.get("data");
        return recs.save(r);
    }
}
