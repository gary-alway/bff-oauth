import { createServer } from "node:http"
import { URL } from "node:url"
import { randomBytes } from "node:crypto"

const PORT = 9000
const ISSUER = `http://localhost:${PORT}`

const discoveryDocument = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/authorize`,
  token_endpoint: `${ISSUER}/token`,
  userinfo_endpoint: `${ISSUER}/userinfo`,
  end_session_endpoint: `${ISSUER}/logout`,
  jwks_uri: `${ISSUER}/.well-known/jwks.json`,
  response_types_supported: ["code"],
  subject_types_supported: ["public"],
  id_token_signing_alg_values_supported: ["RS256"],
  scopes_supported: ["openid", "profile", "email"],
  token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
  code_challenge_methods_supported: ["S256"],
}

const pendingCodes = new Map()

function createIdToken(sub, name, email) {
  const header = { alg: "RS256", typ: "JWT" }
  const payload = {
    iss: ISSUER,
    sub,
    aud: "mock-client-id",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    name,
    email,
  }
  const h = Buffer.from(JSON.stringify(header)).toString("base64url")
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${h}.${p}.mock-signature`
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", () => {
      if (req.headers["content-type"]?.includes("application/x-www-form-urlencoded")) {
        resolve(Object.fromEntries(new URLSearchParams(body)))
      } else {
        resolve(body)
      }
    })
  })
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
}

function json(res, data, status = 200) {
  cors(res)
  res.writeHead(status, { "Content-Type": "application/json" })
  res.end(JSON.stringify(data))
}

function html(res, content, status = 200) {
  cors(res)
  res.writeHead(status, { "Content-Type": "text/html" })
  res.end(content)
}

const TEST_USER = { name: "Test User", email: "test@example.com" }

const loginPage = (redirectUri, state, codeChallenge) => `
<!DOCTYPE html>
<html>
<head>
  <title>Mock OAuth Login</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 40px;
      width: 100%;
      max-width: 400px;
      text-align: center;
    }
    h1 { color: #e94560; margin-bottom: 8px; font-size: 1.5rem; }
    p { color: rgba(255,255,255,0.6); margin-bottom: 24px; font-size: 0.9rem; }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #e94560, #c23a51);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { opacity: 0.9; }
    .user { color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Mock OAuth</h1>
    <p>Simulated authentication</p>
    <form method="POST" action="/authorize/callback">
      <input type="hidden" name="redirect_uri" value="${redirectUri}" />
      <input type="hidden" name="state" value="${state}" />
      <input type="hidden" name="code_challenge" value="${codeChallenge}" />
      <button type="submit">Sign In as Test User</button>
    </form>
    <p class="user">${TEST_USER.name} · ${TEST_USER.email}</p>
  </div>
</body>
</html>
`

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  if (req.method === "OPTIONS") {
    cors(res)
    res.writeHead(204)
    res.end()
    return
  }

  if (url.pathname === "/.well-known/openid-configuration") {
    return json(res, discoveryDocument)
  }

  if (url.pathname === "/.well-known/jwks.json") {
    return json(res, { keys: [] })
  }

  if (url.pathname === "/authorize" && req.method === "GET") {
    const redirectUri = url.searchParams.get("redirect_uri")
    const state = url.searchParams.get("state")
    const codeChallenge = url.searchParams.get("code_challenge")
    return html(res, loginPage(redirectUri, state, codeChallenge))
  }

  if (url.pathname === "/authorize/callback" && req.method === "POST") {
    const body = await parseBody(req)
    const code = randomBytes(16).toString("hex")

    pendingCodes.set(code, {
      email: TEST_USER.email,
      name: TEST_USER.name,
      codeChallenge: body.code_challenge,
      createdAt: Date.now(),
    })

    setTimeout(() => pendingCodes.delete(code), 60000)

    const redirectUrl = new URL(body.redirect_uri)
    redirectUrl.searchParams.set("code", code)
    redirectUrl.searchParams.set("state", body.state)

    res.writeHead(302, { Location: redirectUrl.toString() })
    res.end()
    return
  }

  if (url.pathname === "/token" && req.method === "POST") {
    const body = await parseBody(req)

    if (body.grant_type === "authorization_code") {
      const codeData = pendingCodes.get(body.code)

      if (!codeData) {
        return json(
          res,
          { error: "invalid_grant", error_description: "Code expired or invalid" },
          400
        )
      }

      pendingCodes.delete(body.code)

      const sub = randomBytes(8).toString("hex")
      const idToken = createIdToken(sub, codeData.name, codeData.email)

      return json(res, {
        access_token: `mock-at-${randomBytes(16).toString("hex")}`,
        refresh_token: `mock-rt-${randomBytes(16).toString("hex")}`,
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 3600,
      })
    }

    if (body.grant_type === "refresh_token") {
      const sub = randomBytes(8).toString("hex")
      const idToken = createIdToken(sub, TEST_USER.name, TEST_USER.email)

      return json(res, {
        access_token: `mock-at-${randomBytes(16).toString("hex")}`,
        refresh_token: `mock-rt-${randomBytes(16).toString("hex")}`,
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 3600,
      })
    }

    return json(res, { error: "unsupported_grant_type" }, 400)
  }

  if (url.pathname === "/userinfo") {
    return json(res, {
      sub: "mock-user-id",
      name: TEST_USER.name,
      email: TEST_USER.email,
    })
  }

  if (url.pathname === "/logout") {
    const postLogoutUri = url.searchParams.get("post_logout_redirect_uri")
    if (postLogoutUri) {
      res.writeHead(302, { Location: postLogoutUri })
      res.end()
      return
    }
    return html(res, "<h1>Logged out</h1><p>You can close this window.</p>")
  }

  res.writeHead(404)
  res.end("Not Found")
})

server.listen(PORT, () => {
  console.log(`\n🔐 Mock OAuth Server running at ${ISSUER}`)
  console.log(`   Discovery: ${ISSUER}/.well-known/openid-configuration\n`)
})
