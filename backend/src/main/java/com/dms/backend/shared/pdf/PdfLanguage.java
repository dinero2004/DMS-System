package com.dms.backend.shared.pdf;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Enumeration;
import java.util.Locale;
import java.util.Set;

/** Resolves PDF/UI language from query parameter {@code lang} or {@code Accept-Language}. */
public final class PdfLanguage {
    private static final Set<String> SUPPORTED = Set.of("en", "de", "fr", "it");

    private PdfLanguage() {}

    public static Locale resolve(HttpServletRequest req) {
        if (req != null) {
            String q = req.getParameter("lang");
            if (q != null && !q.isBlank()) {
                String lang = q.trim().toLowerCase(Locale.ROOT).split("[-_]", 2)[0];
                if (SUPPORTED.contains(lang)) {
                    return "en".equals(lang) ? Locale.ENGLISH : Locale.forLanguageTag(lang);
                }
            }
            Enumeration<Locale> locales = req.getLocales();
            while (locales.hasMoreElements()) {
                String lang = locales.nextElement().getLanguage();
                if (SUPPORTED.contains(lang)) {
                    return "en".equals(lang) ? Locale.ENGLISH : Locale.forLanguageTag(lang);
                }
            }
        }
        return Locale.ENGLISH;
    }

    /** For tests or non-servlet callers. */
    public static Locale fromTag(String lang) {
        if (lang == null || lang.isBlank()) return Locale.ENGLISH;
        String code = lang.trim().toLowerCase(Locale.ROOT).split("[-_]", 2)[0];
        if (!SUPPORTED.contains(code)) return Locale.ENGLISH;
        return "en".equals(code) ? Locale.ENGLISH : Locale.forLanguageTag(code);
    }
}
