import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetConfig = vi.fn()
const mockGenerateAuthState = vi.fn()
const mockBuildAuthorizationUrl = vi.fn()
const mockSetAuthState = vi.fn()

vi.mock("@/lib/oauth/config", () => ({
  getConfig: () => mockGetConfig(),
}))

vi.mock("@/lib/oauth/client", () => ({
  generateAuthState: () => mockGenerateAuthState(),
  buildAuthorizationUrl: (...args: unknown[]) => mockBuildAuthorizationUrl(...args),
}))

vi.mock("@/lib/cookies/tokens", () => ({
  setAuthState: (...args: unknown[]) => mockSetAuthState(...args),
}))

describe("POST /api/auth/login/start", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns authorization URL on success", async () => {
    const { POST } = await import("./route")
    const mockConfig = { cookieEncryptionKey: "test-key" }
    const mockState = { codeVerifier: "cv", state: "st" }

    mockGetConfig.mockReturnValue(mockConfig)
    mockGenerateAuthState.mockReturnValue(mockState)
    mockBuildAuthorizationUrl.mockResolvedValue("https://auth.example.com/authorize?...")
    mockSetAuthState.mockResolvedValue(undefined)

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.authorizationUrl).toBe("https://auth.example.com/authorize?...")
    expect(mockSetAuthState).toHaveBeenCalledWith(mockState, "test-key")
  })

  it("returns 500 on config error", async () => {
    const { POST } = await import("./route")
    mockGetConfig.mockImplementation(() => {
      throw new Error("Missing config")
    })

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Failed to start login")
  })

  it("returns 500 when authorization URL build fails", async () => {
    const { POST } = await import("./route")
    mockGetConfig.mockReturnValue({ cookieEncryptionKey: "test-key" })
    mockGenerateAuthState.mockReturnValue({ codeVerifier: "cv", state: "st" })
    mockBuildAuthorizationUrl.mockRejectedValue(new Error("Discovery failed"))

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Failed to start login")
  })
})
