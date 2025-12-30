import * as oauth from "oauth4webapi"
import type { OAuthConfig, TokenSet, IdTokenClaims, AuthState } from "./types"

let discoveryCache: oauth.AuthorizationServer | null = null

export async function getAuthorizationServer(
  config: OAuthConfig
): Promise<oauth.AuthorizationServer> {
  if (discoveryCache) {
    return discoveryCache
  }

  const issuerUrl = new URL(config.issuer)
  const allowHttp = issuerUrl.protocol === "http:"
  const response = await oauth.discoveryRequest(issuerUrl, {
    [oauth.allowInsecureRequests]: allowHttp,
  })
  discoveryCache = await oauth.processDiscoveryResponse(issuerUrl, response)

  return discoveryCache
}

export function clearDiscoveryCache(): void {
  discoveryCache = null
}

export function generateAuthState(): AuthState {
  const codeVerifier = oauth.generateRandomCodeVerifier()
  const state = oauth.generateRandomState()

  return { codeVerifier, state }
}

export async function buildAuthorizationUrl(
  config: OAuthConfig,
  authState: AuthState
): Promise<string> {
  const as = await getAuthorizationServer(config)
  const codeChallenge = await oauth.calculatePKCECodeChallenge(authState.codeVerifier)

  const authUrl = new URL(as.authorization_endpoint!)
  authUrl.searchParams.set("client_id", config.clientId)
  authUrl.searchParams.set("redirect_uri", config.redirectUri)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("scope", config.scopes.join(" "))
  authUrl.searchParams.set("state", authState.state)
  authUrl.searchParams.set("code_challenge", codeChallenge)
  authUrl.searchParams.set("code_challenge_method", "S256")

  return authUrl.toString()
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  id_token?: string
  token_type: string
  expires_in?: number
  error?: string
  error_description?: string
}

export async function exchangeCodeForTokens(
  config: OAuthConfig,
  code: string,
  codeVerifier: string
): Promise<TokenSet> {
  const as = await getAuthorizationServer(config)

  const params = new URLSearchParams()
  params.set("grant_type", "authorization_code")
  params.set("code", code)
  params.set("redirect_uri", config.redirectUri)
  params.set("code_verifier", codeVerifier)
  params.set("client_id", config.clientId)
  params.set("client_secret", config.clientSecret)

  const response = await fetch(as.token_endpoint!, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  })

  const result: TokenResponse = await response.json()

  if (result.error) {
    throw new Error(`Token exchange failed: ${result.error} - ${result.error_description}`)
  }

  const expiresIn = result.expires_in ?? 3600
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token ?? null,
    idToken: result.id_token ?? null,
    expiresAt,
  }
}

export async function refreshTokens(config: OAuthConfig, refreshToken: string): Promise<TokenSet> {
  const as = await getAuthorizationServer(config)

  const params = new URLSearchParams()
  params.set("grant_type", "refresh_token")
  params.set("refresh_token", refreshToken)
  params.set("client_id", config.clientId)
  params.set("client_secret", config.clientSecret)

  const response = await fetch(as.token_endpoint!, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  })

  const result: TokenResponse = await response.json()

  if (result.error) {
    throw new Error(`Token refresh failed: ${result.error} - ${result.error_description}`)
  }

  const expiresIn = result.expires_in ?? 3600
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token ?? refreshToken,
    idToken: result.id_token ?? null,
    expiresAt,
  }
}

export function parseIdTokenClaims(idToken: string | null): IdTokenClaims | null {
  if (!idToken) {
    return null
  }

  try {
    const parts = idToken.split(".")
    if (parts.length !== 3) {
      return null
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))
    return {
      sub: payload.sub,
      name: payload.name,
      email: payload.email,
      ...payload,
    }
  } catch {
    return null
  }
}

export async function buildLogoutUrl(
  config: OAuthConfig,
  idToken: string | null
): Promise<string | null> {
  const as = await getAuthorizationServer(config)

  if (!as.end_session_endpoint) {
    return null
  }

  const logoutUrl = new URL(as.end_session_endpoint)
  logoutUrl.searchParams.set("client_id", config.clientId)

  if (idToken) {
    logoutUrl.searchParams.set("id_token_hint", idToken)
  }

  const postLogoutRedirect = new URL(config.redirectUri)
  postLogoutRedirect.pathname = "/"
  logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutRedirect.origin)

  return logoutUrl.toString()
}
