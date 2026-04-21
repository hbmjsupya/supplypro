package com.supplypro.service.impl;

import com.supplypro.service.SnapshotStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
@Slf4j
public class LocalSnapshotStorageService implements SnapshotStorageService {

    private static final String STORAGE_DIR = "snapshots";

    public LocalSnapshotStorageService() {
        try {
            Files.createDirectories(Paths.get(STORAGE_DIR));
        } catch (IOException e) {
            log.error("Failed to create snapshot storage directory", e);
        }
    }

    @Override
    public void storeSnapshot(String orderNo, int version, String jsonData) {
        String fileName = String.format("%s_v%d.json", orderNo, version);
        Path path = Paths.get(STORAGE_DIR, fileName);
        try {
            Files.writeString(path, jsonData);
            log.info("Stored snapshot backup to {}", path.toAbsolutePath());
        } catch (IOException e) {
            log.error("Failed to store snapshot backup", e);
            // Non-blocking for now, as DB is primary
        }
    }

    @Override
    public String retrieveSnapshot(String orderNo, int version) {
        String fileName = String.format("%s_v%d.json", orderNo, version);
        Path path = Paths.get(STORAGE_DIR, fileName);
        try {
            return Files.readString(path);
        } catch (IOException e) {
            log.error("Failed to read snapshot backup", e);
            return null;
        }
    }
}
