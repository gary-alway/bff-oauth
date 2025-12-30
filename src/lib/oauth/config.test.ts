import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { getConfig, validateConfig } from "./config"

describe("config", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("getConfig", () => {
    it("returns config from environment variables", () => {
      process.env.AUTH_ISSUER = "https://auth.example.com"
      process.env.AUTH_CLIENT_ID = "test-client"
      process.env.AUTH_CLIENT_SECRET = "test-secret"
      process.env.AUTH_REDIRECT_URI = "http://localhost:3000/api/auth/login/end"
      process.env.COOKIE_ENCRYPTION_KEY = "test-key"

      const config = getConfig()

      expect(config.issuer).toBe("https://auth.example.com")
      expect(config.clientId).toBe("test-client")
      expect(config.clientSecret).toBe("test-secret")
      expect(config.redirectUri).toBe("http://localhost:3000/api/auth/login/end")
      expect(config.cookieEncryptionKey).toBe("test-key")
    })

    it("uses default scopes when not provided", () => {
      process.env.AUTH_ISSUER = "https://auth.example.com"
      process.env.AUTH_CLIENT_ID = "test-client"
      process.env.AUTH_CLIENT_SECRET = "test-secret"
      process.env.AUTH_REDIRECT_URI = "http://localhost:3000/api/auth/login/end"
      process.env.COOKIE_ENCRYPTION_KEY = "test-key"

      const config = getConfig()

      expect(config.scopes).toEqual(["openid", "profile", "email"])
    })

    it("parses custom scopes from environment", () => {
      process.env.AUTH_ISSUER = "https://auth.example.com"
      process.env.AUTH_CLIENT_ID = "test-client"
      process.env.AUTH_CLIENT_SECRET = "test-secret"
      process.env.AUTH_REDIRECT_URI = "http://localhost:3000/api/auth/login/end"
      process.env.COOKIE_ENCRYPTION_KEY = "test-key"
      process.env.AUTH_SCOPES = "openid email custom:scope"

      const config = getConfig()

      expect(config.scopes).toEqual(["openid", "email", "custom:scope"])
    })

    it("throws when AUTH_ISSUER is missing", () => {
      process.env.AUTH_CLIENT_ID = "test-client"
      process.env.AUTH_CLIENT_SECRET = "test-secret"
      process.env.AUTH_REDIRECT_URI = "http://localhost:3000/api/auth/login/end"
      process.env.COOKIE_ENCRYPTION_KEY = "test-key"

      expect(() => getConfig()).toThrow("AUTH_ISSUER is required")
    })

    it("throws when AUTH_CLIENT_ID is missing", () => {
      process.env.AUTH_ISSUER = "https://auth.example.com"
      process.env.AUTH_CLIENT_SECRET = "test-secret"
      process.env.AUTH_REDIRECT_URI = "http://localhost:3000/api/auth/login/end"
      process.env.COOKIE_ENCRYPTION_KEY = "test-key"

      expect(() => getConfig()).toThrow("AUTH_CLIENT_ID is required")
    })

    it("throws when COOKIE_ENCRYPTION_KEY is missing", () => {
      process.env.AUTH_ISSUER = "https://auth.example.com"
      process.env.AUTH_CLIENT_ID = "test-client"
      process.env.AUTH_CLIENT_SECRET = "test-secret"
      process.env.AUTH_REDIRECT_URI = "http://localhost:3000/api/auth/login/end"

      expect(() => getConfig()).toThrow("COOKIE_ENCRYPTION_KEY is required")
    })
  })

  describe("validateConfig", () => {
    it("returns true for valid config", () => {
      const config = {
        issuer: "https://auth.example.com",
        clientId: "test-client",
        clientSecret: "test-secret",
        redirectUri: "http://localhost:3000/api/auth/login/end",
        scopes: ["openid"],
        cookieEncryptionKey: "test-key",
      }

      expect(validateConfig(config)).toBe(true)
    })

    it("returns false for missing issuer", () => {
      const config = {
        clientId: "test-client",
        clientSecret: "test-secret",
        redirectUri: "http://localhost:3000/api/auth/login/end",
        cookieEncryptionKey: "test-key",
      }

      expect(validateConfig(config)).toBe(false)
    })

    it("returns false for missing clientId", () => {
      const config = {
        issuer: "https://auth.example.com",
        clientSecret: "test-secret",
        redirectUri: "http://localhost:3000/api/auth/login/end",
        cookieEncryptionKey: "test-key",
      }

      expect(validateConfig(config)).toBe(false)
    })
  })
})
