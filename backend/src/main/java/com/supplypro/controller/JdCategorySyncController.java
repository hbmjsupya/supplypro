package com.supplypro.controller;

import com.supplypro.service.JdCategorySyncService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/jd-categories")
public class JdCategorySyncController {

    @Autowired
    private JdCategorySyncService jdCategorySyncService;

    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> syncFromJd() {
        return ResponseEntity.ok(jdCategorySyncService.syncFromJd());
    }
}
