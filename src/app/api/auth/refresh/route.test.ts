import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetConfig = vi.fn()
const mockGetRefreshToken = vi.fn()
const mockRefreshTokens = vi.fn()
const mockSetTokenCookies = vi.fn()

vi.mock("@/lib/oauth/config", () => ({
  getConfig: () => mockGetConfig(),
}))

vi.mock("@/lib/cookies/tokens", () => ({
  getRefreshToken: (...args: unknown[]) => mockGetRefreshToken(...args),
  setTokenCookies: (...args: unknown[]) => mockSetTokenCookies(...args),
}))

vi.mock("@/lib/oauth/client", () => ({
  refreshTokens: (...args: unknown[]) => mockRefreshTokens(...args),
}))

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetConfig.mockReturnValue({ cookieEncryptionKey: "test-key" })
  })

  it("returns 401 when no refresh token present", async () => {
    const { POST } = await import("./route")
    mockGetRefreshToken.mockResolvedValue(null)

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toContain("No refresh token")
  })

  it("refreshes tokens and returns success", async () => {
    const { POST } = await import("./route")
    mockGetRefreshToken.mockResolvedValue("test-rt")
    mockRefreshTokens.mockResolvedValue({
      accessToken: "new-at",
      refreshToken: "new-rt",
      idToken: "new-id",
      expiresAt: 12345,
    })
    mockSetTokenCookies.mockResolvedValue(undefined)

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockRefreshTokens).toHaveBeenCalled()
    expect(mockSetTokenCookies).toHaveBeenCalled()
  })

  it("returns 500 on refresh failure", async () => {
    const { POST } = await import("./route")
    mockGetRefreshToken.mockResolvedValue("test-rt")
    mockRefreshTokens.mockRejectedValue(new Error("Refresh failed"))

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toContain("Failed to refresh")
  })
})
