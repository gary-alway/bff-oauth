import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mockGetConfig = vi.fn()
const mockExchangeCodeForTokens = vi.fn()
const mockParseIdTokenClaims = vi.fn()
const mockGetAuthState = vi.fn()
const mockClearAuthState = vi.fn()
const mockSetTokenCookies = vi.fn()

vi.mock("@/lib/oauth/config", () => ({
  getConfig: () => mockGetConfig(),
}))

vi.mock("@/lib/oauth/client", () => ({
  exchangeCodeForTokens: (...args: unknown[]) => mockExchangeCodeForTokens(...args),
  parseIdTokenClaims: (...args: unknown[]) => mockParseIdTokenClaims(...args),
}))

vi.mock("@/lib/cookies/tokens", () => ({
  getAuthState: (...args: unknown[]) => mockGetAuthState(...args),
  clearAuthState: () => mockClearAuthState(),
  setTokenCookies: (...args: unknown[]) => mockSetTokenCookies(...args),
}))

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/auth/login/end", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/auth/login/end", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetConfig.mockReturnValue({ cookieEncryptionKey: "test-key" })
  })

  it("returns 400 when code is missing", async () => {
    const { POST } = await import("./route")
    const request = createRequest({ state: "test-state" })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("Missing code")
  })

  it("returns 400 when state is missing", async () => {
    const { POST } = await import("./route")
    const request = createRequest({ code: "test-code" })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("Missing")
  })

  it("returns 400 when no auth state found", async () => {
    const { POST } = await import("./route")
    mockGetAuthState.mockResolvedValue(null)
    const request = createRequest({ code: "test-code", state: "test-state" })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("auth state")
  })

  it("returns 400 on state mismatch", async () => {
    const { POST } = await import("./route")
    mockGetAuthState.mockResolvedValue({ state: "different-state", codeVerifier: "cv" })
    const request = createRequest({ code: "test-code", state: "test-state" })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("State mismatch")
  })

  it("exchanges code and returns claims on success", async () => {
    const { POST } = await import("./route")
    mockGetAuthState.mockResolvedValue({ state: "test-state", codeVerifier: "test-cv" })
    mockExchangeCodeForTokens.mockResolvedValue({
      accessToken: "at",
      refreshToken: "rt",
      idToken: "id",
      expiresAt: 12345,
    })
    mockParseIdTokenClaims.mockReturnValue({ sub: "123", name: "Test" })
    mockSetTokenCookies.mockResolvedValue(undefined)
    mockClearAuthState.mockResolvedValue(undefined)

    const request = createRequest({ code: "test-code", state: "test-state" })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.claims).toEqual({ sub: "123", name: "Test" })
    expect(mockExchangeCodeForTokens).toHaveBeenCalledWith(
      expect.anything(),
      "test-code",
      "test-cv"
    )
  })
})
