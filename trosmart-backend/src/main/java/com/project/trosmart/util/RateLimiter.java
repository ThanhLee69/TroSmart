package com.project.trosmart.util;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// Giới hạn số lần gọi theo "cửa sổ trượt", lưu trong bộ nhớ (đủ cho 1 server).
// Nếu sau này chạy nhiều server thì đổi sang Redis.
@Component
public class RateLimiter {

    // Dọn dữ liệu cũ khi số key vượt ngưỡng, tránh tràn bộ nhớ khi bị tấn công nhiều IP
    private static final int CLEANUP_THRESHOLD = 10_000;
    private static final long MAX_KEEP_MILLIS = Duration.ofHours(24).toMillis();

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    /**
     * Ghi nhận 1 lượt gọi cho key.
     *
     * @return true nếu còn trong hạn mức, false nếu đã vượt
     */
    public boolean tryAcquire(String key, int limit, Duration window) {
        long now = System.currentTimeMillis();
        long from = now - window.toMillis();

        if (hits.size() > CLEANUP_THRESHOLD) {
            cleanup(now - MAX_KEEP_MILLIS);
        }

        Deque<Long> queue = hits.computeIfAbsent(key, k -> new ArrayDeque<>());

        synchronized (queue) {
            while (!queue.isEmpty() && queue.peekFirst() < from) {
                queue.pollFirst();
            }
            if (queue.size() >= limit) {
                return false;
            }
            queue.addLast(now);
            return true;
        }
    }

    private void cleanup(long cutoff) {
        hits.entrySet().removeIf(entry -> {
            Deque<Long> queue = entry.getValue();
            synchronized (queue) {
                Long last = queue.peekLast();
                return last == null || last < cutoff;
            }
        });
    }
}
