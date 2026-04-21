import requests
import threading
import time
import random

# Configuration
BASE_URL = "http://localhost:8080/api/purchase-orders"
CONCURRENT_REQUESTS = 1000
TOTAL_REQUESTS = 1000
AUTH_TOKEN = "Bearer YOUR_TEST_TOKEN_HERE"  # Replace with a valid token if auth is enabled

# Statistics
success_count = 0
fail_count = 0
latencies = []
lock = threading.Lock()

def make_request():
    global success_count, fail_count
    start_time = time.time()
    try:
        # Simulate different search criteria
        params = {
            "page": 0,
            "size": 10,
            "status": random.choice(["PENDING", "CONFIRMED", "COMPLETED", ""]),
            "keyword": "PO"
        }
        headers = {
            "Authorization": AUTH_TOKEN,
            "Content-Type": "application/json"
        }
        
        response = requests.get(BASE_URL, params=params, headers=headers, timeout=5)
        
        latency = (time.time() - start_time) * 1000 # ms
        
        with lock:
            latencies.append(latency)
            if response.status_code == 200:
                success_count += 1
            else:
                fail_count += 1
                print(f"Failed with status: {response.status_code}")
                
    except Exception as e:
        with lock:
            fail_count += 1
            print(f"Request failed: {e}")

def run_test():
    print(f"Starting stress test with {CONCURRENT_REQUESTS} concurrent requests...")
    threads = []
    
    start_total = time.time()
    
    for _ in range(CONCURRENT_REQUESTS):
        t = threading.Thread(target=make_request)
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    end_total = time.time()
    duration = end_total - start_total
    
    print("\n--- Test Results ---")
    print(f"Total Requests: {TOTAL_REQUESTS}")
    print(f"Successful: {success_count}")
    print(f"Failed: {fail_count}")
    print(f"Total Duration: {duration:.2f} seconds")
    print(f"RPS: {TOTAL_REQUESTS / duration:.2f}")
    
    if latencies:
        latencies.sort()
        p50 = latencies[int(len(latencies) * 0.5)]
        p95 = latencies[int(len(latencies) * 0.95)]
        p99 = latencies[int(len(latencies) * 0.99)]
        avg = sum(latencies) / len(latencies)
        
        print(f"Average Latency: {avg:.2f} ms")
        print(f"P50 Latency: {p50:.2f} ms")
        print(f"P95 Latency: {p95:.2f} ms")
        print(f"P99 Latency: {p99:.2f} ms")
        
        if p95 < 200:
            print("\n✅ PASSED: P95 Latency < 200ms")
        else:
            print("\n❌ FAILED: P95 Latency >= 200ms")

if __name__ == "__main__":
    run_test()
