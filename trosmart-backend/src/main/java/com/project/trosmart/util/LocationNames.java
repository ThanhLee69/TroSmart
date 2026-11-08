package com.project.trosmart.util;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * So khớp tên đơn vị hành chính không phụ thuộc cách viết tiền tố.
 * "Thành phố Hà Nội", "TP Hà Nội"... trong DB hay "Hà Nội" từ bộ lọc đều khớp nhau.
 */
public final class LocationNames {

    private static final List<String> PREFIXES = List.of(
            "thành phố ", "tỉnh ", "phường ", "xã ", "đặc khu ",
            "thị trấn ", "thị xã ", "quận ", "huyện "
    );

    // Tiền tố có thể gặp trong DB khi tên đã bỏ tiền tố
    private static final List<String> STORED_PREFIXES = List.of(
            "thành phố ", "tỉnh ", "phường ", "xã ", "đặc khu "
    );

    private LocationNames() {
    }

    /** Viết thường, gọn khoảng trắng. */
    public static String normalize(String name) {
        return name == null
                ? ""
                : name.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    /** Bỏ tiền tố "Tỉnh", "Phường"... ở đầu (đã viết thường). */
    public static String strip(String name) {
        String n = normalize(name);
        for (String prefix : PREFIXES) {
            if (n.startsWith(prefix)) {
                return n.substring(prefix.length()).trim();
            }
        }
        return n;
    }

    /** Các cách viết (viết thường) mà giá trị trong DB có thể mang. */
    public static Set<String> variants(String name) {
        String full = normalize(name);
        String core = strip(name);

        Set<String> result = new LinkedHashSet<>();
        result.add(full);
        result.add(core);
        for (String prefix : STORED_PREFIXES) {
            result.add(prefix + core);
        }
        return result;
    }
}