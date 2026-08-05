package com.dms.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dms.auth")
public class DmsAuthProperties {

	private String username = "demo";
	private String password = "demo";

	public String getUsername() {
		return username;
	}

	public void setUsername(String username) {
		if (username != null && !username.isBlank()) {
			this.username = username;
		}
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		if (password != null && !password.isBlank()) {
			this.password = password;
		}
	}
}
