package com.supplypro.service;

public interface SnapshotStorageService {
    void storeSnapshot(String orderNo, int version, String jsonData);
    String retrieveSnapshot(String orderNo, int version);
}
