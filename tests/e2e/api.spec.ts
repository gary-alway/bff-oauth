import { test, expect } from "@playwright/test"

test.describe("BFF OAuth API", () => {
  test("GET /api/auth/session returns logged out state initially", async ({ request }) => {
    const response = await request.get("/api/auth/session")

    expect(response.ok()).toBe(true)
    const body = await response.json()
    expect(body.isLoggedIn).toBe(false)
    expect(body.claims).toBeNull()
  })

  test("POST /api/auth/login/start returns authorization URL", async ({ request }) => {
    const response = await request.post("/api/auth/login/start")

    expect(response.ok()).toBe(true)
    const body = await response.json()
    expect(body.authorizationUrl).toBeDefined()
    expect(body.authorizationUrl).toContain("http://localhost:9000/authorize")
    expect(body.authorizationUrl).toContain("client_id=")
    expect(body.authorizationUrl).toContain("code_challenge=")
    expect(body.authorizationUrl).toContain("state=")
  })

  test("POST /api/auth/login/end rejects missing code", async ({ request }) => {
    const response = await request.post("/api/auth/login/end", {
      data: { state: "test" },
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain("Missing code")
  })

  test("POST /api/auth/login/end rejects invalid state", async ({ request }) => {
    const response = await request.post("/api/auth/login/end", {
      data: { code: "test", state: "invalid" },
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain("state")
  })

  test("POST /api/auth/refresh returns 401 without session", async ({ request }) => {
    const response = await request.post("/api/auth/refresh")

    expect(response.status()).toBe(401)
  })

  test("POST /api/auth/logout clears session", async ({ request }) => {
    const response = await request.post("/api/auth/logout")

    expect(response.ok()).toBe(true)
    const body = await response.json()
    expect(body).toHaveProperty("logoutUrl")
  })
})
