import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetConfig = vi.fn()
const mockGetAccessToken = vi.fn()
const mockParseIdTokenClaims = vi.fn()

vi.mock("@/lib/oauth/config", () => ({
  getConfig: () => mockGetConfig(),
}))

vi.mock("@/lib/cookies/tokens", () => ({
  getAccessToken: (...args: unknown[]) => mockGetAccessToken(...args),
}))

vi.mock("@/lib/oauth/client", () => ({
  parseIdTokenClaims: (...args: unknown[]) => mockParseIdTokenClaims(...args),
}))

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetConfig.mockReturnValue({ cookieEncryptionKey: "test-key" })
  })

  it("returns logged out when no token present", async () => {
    const { GET } = await import("./route")
    mockGetAccessToken.mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.isLoggedIn).toBe(false)
    expect(body.claims).toBeNull()
  })

  it("returns logged out when token expired", async () => {
    const { GET } = await import("./route")
    mockGetAccessToken.mockResolvedValue({
      accessToken: "at",
      idToken: "id",
      expiresAt: Math.floor(Date.now() / 1000) - 3600,
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.isLoggedIn).toBe(false)
  })

  it("returns logged in with claims when valid token present", async () => {
    const { GET } = await import("./route")
    mockGetAccessToken.mockResolvedValue({
      accessToken: "at",
      idToken: "id",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    })
    mockParseIdTokenClaims.mockReturnValue({ sub: "123", name: "Test User" })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.isLoggedIn).toBe(true)
    expect(body.claims).toEqual({ sub: "123", name: "Test User" })
  })

  it("returns logged out on error", async () => {
    const { GET } = await import("./route")
    mockGetConfig.mockImplementation(() => {
      throw new Error("Config error")
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.isLoggedIn).toBe(false)
  })
})
