const required = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const;

// Runs once at boot. A missing secret shouldn't surface as a confusing runtime
// error on the first login attempt — fail loudly at startup instead.
export function validateEnv() {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }

  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.");
  }

  if (process.env.NODE_ENV === "production" && !process.env.CORS_ORIGIN?.trim()) {
    throw new Error("CORS_ORIGIN must be set in production.");
  }
}
