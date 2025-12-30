import { describe, it, expect, vi, beforeEach } from "vitest"
import { encrypt } from "./encryption"
import { generateEncryptionKey } from "./encryption"

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
}

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}))

const testKey = generateEncryptionKey()

describe("tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("setTokenCookies", () => {
    it("sets access token cookie with correct options", async () => {
      const { setTokenCookies } = await import("./tokens")
      const tokens = {
        accessToken: "test-at",
        refreshToken: "test-rt",
        idToken: "test-id",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      }

      await setTokenCookies(tokens, testKey)

      expect(mockCookieStore.set).toHaveBeenCalledTimes(2)

      const atCall = mockCookieStore.set.mock.calls[0]
      expect(atCall[0]).toBe("at")
      expect(atCall[2]).toMatchObject({
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      })
    })

    it("sets refresh token cookie with restricted path", async () => {
      const { setTokenCookies } = await import("./tokens")
      const tokens = {
        accessToken: "test-at",
        refreshToken: "test-rt",
        idToken: null,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      }

      await setTokenCookies(tokens, testKey)

      const rtCall = mockCookieStore.set.mock.calls[1]
      expect(rtCall[0]).toBe("rt")
      expect(rtCall[2]).toMatchObject({
        httpOnly: true,
        sameSite: "strict",
        path: "/api/auth",
      })
    })

    it("skips refresh token cookie when not provided", async () => {
      const { setTokenCookies } = await import("./tokens")
      const tokens = {
        accessToken: "test-at",
        refreshToken: null,
        idToken: null,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      }

      await setTokenCookies(tokens, testKey)

      expect(mockCookieStore.set).toHaveBeenCalledTimes(1)
      expect(mockCookieStore.set.mock.calls[0][0]).toBe("at")
    })
  })

  describe("getAccessToken", () => {
    it("returns null when no cookie present", async () => {
      const { getAccessToken } = await import("./tokens")
      mockCookieStore.get.mockReturnValue(undefined)

      const result = await getAccessToken(testKey)

      expect(result).toBeNull()
    })

    it("returns decrypted token data when cookie present", async () => {
      const { getAccessToken } = await import("./tokens")
      const tokenData = { accessToken: "test-at", idToken: "test-id", expiresAt: 12345 }
      const encrypted = await encrypt(tokenData, testKey)
      mockCookieStore.get.mockReturnValue({ value: encrypted })

      const result = await getAccessToken(testKey)

      expect(result).toMatchObject(tokenData)
    })
  })

  describe("getRefreshToken", () => {
    it("returns null when no cookie present", async () => {
      const { getRefreshToken } = await import("./tokens")
      mockCookieStore.get.mockReturnValue(undefined)

      const result = await getRefreshToken(testKey)

      expect(result).toBeNull()
    })

    it("returns decrypted refresh token when cookie present", async () => {
      const { getRefreshToken } = await import("./tokens")
      const encrypted = await encrypt({ refreshToken: "test-rt" }, testKey)
      mockCookieStore.get.mockReturnValue({ value: encrypted })

      const result = await getRefreshToken(testKey)

      expect(result).toBe("test-rt")
    })
  })

  describe("clearTokenCookies", () => {
    it("deletes all token cookies", async () => {
      const { clearTokenCookies } = await import("./tokens")

      await clearTokenCookies()

      expect(mockCookieStore.delete).toHaveBeenCalledWith("at")
      expect(mockCookieStore.delete).toHaveBeenCalledWith("rt")
      expect(mockCookieStore.delete).toHaveBeenCalledWith("auth_state")
    })
  })

  describe("setAuthState", () => {
    it("sets auth state cookie with short expiry", async () => {
      const { setAuthState } = await import("./tokens")
      const state = { codeVerifier: "cv", state: "st" }

      await setAuthState(state, testKey)

      expect(mockCookieStore.set).toHaveBeenCalledTimes(1)
      const call = mockCookieStore.set.mock.calls[0]
      expect(call[0]).toBe("auth_state")
      expect(call[2].maxAge).toBe(600)
    })
  })

  describe("getAuthState", () => {
    it("returns null when no cookie present", async () => {
      const { getAuthState } = await import("./tokens")
      mockCookieStore.get.mockReturnValue(undefined)

      const result = await getAuthState(testKey)

      expect(result).toBeNull()
    })

    it("returns decrypted auth state when cookie present", async () => {
      const { getAuthState } = await import("./tokens")
      const state = { codeVerifier: "cv", state: "st" }
      const encrypted = await encrypt(state, testKey)
      mockCookieStore.get.mockReturnValue({ value: encrypted })

      const result = await getAuthState(testKey)

      expect(result).toMatchObject(state)
    })
  })

  describe("clearAuthState", () => {
    it("deletes auth state cookie", async () => {
      const { clearAuthState } = await import("./tokens")

      await clearAuthState()

      expect(mockCookieStore.delete).toHaveBeenCalledWith("auth_state")
    })
  })
})
