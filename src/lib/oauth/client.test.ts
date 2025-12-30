import { describe, it, expect, beforeEach, vi } from "vitest"
import { generateAuthState, parseIdTokenClaims, clearDiscoveryCache } from "./client"

describe("oauth client", () => {
  beforeEach(() => {
    clearDiscoveryCache()
    vi.restoreAllMocks()
  })

  describe("generateAuthState", () => {
    it("generates codeVerifier and state", () => {
      const authState = generateAuthState()

      expect(authState.codeVerifier).toBeDefined()
      expect(authState.state).toBeDefined()
      expect(authState.codeVerifier.length).toBeGreaterThan(40)
      expect(authState.state.length).toBeGreaterThan(20)
    })

    it("generates unique values each time", () => {
      const state1 = generateAuthState()
      const state2 = generateAuthState()

      expect(state1.codeVerifier).not.toBe(state2.codeVerifier)
      expect(state1.state).not.toBe(state2.state)
    })
  })

  describe("parseIdTokenClaims", () => {
    it("parses claims from valid ID token", () => {
      const idToken =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIn0.signature"
      const claims = parseIdTokenClaims(idToken)

      expect(claims?.sub).toBe("1234567890")
      expect(claims?.name).toBe("John Doe")
      expect(claims?.email).toBe("john@example.com")
    })

    it("returns null for null input", () => {
      expect(parseIdTokenClaims(null)).toBeNull()
    })

    it("returns null for invalid token format", () => {
      expect(parseIdTokenClaims("invalid")).toBeNull()
      expect(parseIdTokenClaims("a.b")).toBeNull()
    })

    it("returns null for invalid base64 payload", () => {
      expect(parseIdTokenClaims("a.!!!invalid!!!.c")).toBeNull()
    })
  })
})
