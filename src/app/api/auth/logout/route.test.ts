import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetConfig = vi.fn()
const mockGetAccessToken = vi.fn()
const mockClearTokenCookies = vi.fn()
const mockBuildLogoutUrl = vi.fn()
const mockParseIdTokenClaims = vi.fn()

vi.mock("@/lib/oauth/config", () => ({
  getConfig: () => mockGetConfig(),
}))

vi.mock("@/lib/cookies/tokens", () => ({
  getAccessToken: (...args: unknown[]) => mockGetAccessToken(...args),
  clearTokenCookies: () => mockClearTokenCookies(),
}))

vi.mock("@/lib/oauth/client", () => ({
  buildLogoutUrl: (...args: unknown[]) => mockBuildLogoutUrl(...args),
  parseIdTokenClaims: (...args: unknown[]) => mockParseIdTokenClaims(...args),
}))

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetConfig.mockReturnValue({ cookieEncryptionKey: "test-key" })
  })

  it("clears cookies and returns null logout URL when no token", async () => {
    const { POST } = await import("./route")
    mockGetAccessToken.mockResolvedValue(null)
    mockClearTokenCookies.mockResolvedValue(undefined)

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.logoutUrl).toBeNull()
    expect(mockClearTokenCookies).toHaveBeenCalled()
  })

  it("returns logout URL when token present", async () => {
    const { POST } = await import("./route")
    mockGetAccessToken.mockResolvedValue({
      accessToken: "at",
      idToken: "id-token",
      expiresAt: 12345,
    })
    mockParseIdTokenClaims.mockReturnValue({ sub: "123" })
    mockBuildLogoutUrl.mockResolvedValue("https://auth.example.com/logout?...")
    mockClearTokenCookies.mockResolvedValue(undefined)

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.logoutUrl).toBe("https://auth.example.com/logout?...")
    expect(mockClearTokenCookies).toHaveBeenCalled()
  })

  it("still clears cookies on error", async () => {
    const { POST } = await import("./route")
    mockGetConfig.mockImplementation(() => {
      throw new Error("Config error")
    })
    mockClearTokenCookies.mockResolvedValue(undefined)

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.logoutUrl).toBeNull()
    expect(mockClearTokenCookies).toHaveBeenCalled()
  })
})
