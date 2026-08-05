package com.dms.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dms.uploads")
public class DmsUploadProperties {

    /** Base directory for uploads (default: ./uploads). */
    private String baseDir = "uploads";

    public String getBaseDir() {
        return baseDir;
    }

    public void setBaseDir(String baseDir) {
        this.baseDir = baseDir;
    }
}
