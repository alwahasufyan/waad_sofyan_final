package com.waad.tba.modules.report.util;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DecimalStyle;
import java.util.Locale;

public final class ReportFormatUtils {

    private static final DateTimeFormatter EN_DATE_FORMATTER = DateTimeFormatter
            .ofPattern("dd-MM-uuuu", Locale.ENGLISH)
            .withDecimalStyle(DecimalStyle.STANDARD);

    private ReportFormatUtils() {
    }

    public static String formatAmount(BigDecimal value) {
        NumberFormat nf = NumberFormat.getNumberInstance(Locale.ENGLISH);
        nf.setGroupingUsed(true);
        nf.setMinimumFractionDigits(3);
        nf.setMaximumFractionDigits(3);
        return nf.format(value == null ? BigDecimal.ZERO : value);
    }

    public static String formatDate(LocalDate value) {
        if (value == null) {
            return "-";
        }
        return EN_DATE_FORMATTER.format(value);
    }

    public static String toEnglishDigits(Object value) {
        if (value == null) {
            return "";
        }

        String input = String.valueOf(value);
        StringBuilder out = new StringBuilder(input.length());

        for (int i = 0; i < input.length(); i++) {
            char ch = input.charAt(i);
            if (ch >= '\u0660' && ch <= '\u0669') {
                out.append((char) ('0' + (ch - '\u0660')));
            } else if (ch >= '\u06F0' && ch <= '\u06F9') {
                out.append((char) ('0' + (ch - '\u06F0')));
            } else {
                out.append(ch);
            }
        }

        return out.toString();
    }
}