package com.project.trosmart.util;

/**
 * Đọc số tiền thành chữ tiếng Việt, ví dụ 3.500.000 thành "Ba triệu năm trăm nghìn đồng".
 */
public final class VietnameseNumberToWords {

    private static final String[] DIGITS =
            {"không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"};

    private VietnameseNumberToWords() {
    }

    /** Số tiền thành chữ, viết hoa chữ cái đầu và có chữ "đồng" ở cuối. */
    public static String moneyToWords(long amount) {
        if (amount < 0) {
            return "Âm " + lowerFirst(moneyToWords(-amount));
        }

        String words = toWords(amount) + " đồng";

        return Character.toUpperCase(words.charAt(0)) + words.substring(1);
    }

    private static String toWords(long n) {
        if (n == 0) {
            return DIGITS[0];
        }

        // Từ tỷ trở lên đọc đệ quy: 1.000.000.000.000 là "một nghìn tỷ"
        if (n >= 1_000_000_000L) {
            long billions = n / 1_000_000_000L;
            long rest = n % 1_000_000_000L;

            String result = toWords(billions) + " tỷ";

            if (rest > 0) {
                result += " " + belowBillion(rest, true);
            }

            return result;
        }

        return belowBillion(n, false);
    }

    /**
     * Đọc số dưới một tỷ theo từng nhóm triệu, nghìn, đơn vị.
     * hasHigher = true khi phía trước đã có nhóm lớn hơn (tỷ), để nhóm đầu
     * đọc đủ "không trăm" và "linh" (1.000.005.000 là "một tỷ không trăm linh năm nghìn").
     */
    private static String belowBillion(long n, boolean hasHigher) {
        int millions = (int) (n / 1_000_000);
        int thousands = (int) ((n % 1_000_000) / 1_000);
        int units = (int) (n % 1_000);

        StringBuilder sb = new StringBuilder();
        boolean started = hasHigher;

        if (millions > 0) {
            append(sb, readGroup(millions, started) + " triệu");
            started = true;
        }

        if (thousands > 0) {
            append(sb, readGroup(thousands, started) + " nghìn");
            started = true;
        }

        if (units > 0) {
            append(sb, readGroup(units, started));
        }

        return sb.toString();
    }

    /**
     * Đọc một nhóm 1 đến 999.
     * needZeroHundred = true: nhóm không phải nhóm đầu nên phải đọc "không trăm" khi hàng trăm bằng 0.
     */
    private static String readGroup(int n, boolean needZeroHundred) {
        int hundreds = n / 100;
        int tens = (n % 100) / 10;
        int ones = n % 10;

        StringBuilder sb = new StringBuilder();

        if (hundreds > 0 || needZeroHundred) {
            append(sb, DIGITS[hundreds] + " trăm");
        }

        if (tens > 1) {
            append(sb, DIGITS[tens] + " mươi");

            if (ones == 1) {
                append(sb, "mốt");
            } else if (ones == 4) {
                append(sb, "tư");
            } else if (ones == 5) {
                append(sb, "lăm");
            } else if (ones > 0) {
                append(sb, DIGITS[ones]);
            }
        } else if (tens == 1) {
            append(sb, "mười");

            if (ones == 5) {
                append(sb, "lăm");
            } else if (ones > 0) {
                append(sb, DIGITS[ones]);
            }
        } else if (ones > 0) {
            // Hàng chục bằng 0: có hàng trăm đứng trước thì đọc "linh"
            if (hundreds > 0 || needZeroHundred) {
                append(sb, "linh");
            }

            append(sb, DIGITS[ones]);
        }

        return sb.toString();
    }

    private static void append(StringBuilder sb, String part) {
        if (sb.length() > 0) {
            sb.append(' ');
        }

        sb.append(part);
    }

    private static String lowerFirst(String value) {
        return Character.toLowerCase(value.charAt(0)) + value.substring(1);
    }
}
