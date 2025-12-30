import type { OAuthConfig } from "./types"

export function getConfig(): OAuthConfig {
  const issuer = process.env.AUTH_ISSUER
  const clientId = process.env.AUTH_CLIENT_ID
  const clientSecret = process.env.AUTH_CLIENT_SECRET
  const redirectUri = process.env.AUTH_REDIRECT_URI
  const scopes = process.env.AUTH_SCOPES?.split(" ") ?? ["openid", "profile", "email"]
  const cookieEncryptionKey = process.env.COOKIE_ENCRYPTION_KEY

  if (!issuer) throw new Error("AUTH_ISSUER is required")
  if (!clientId) throw new Error("AUTH_CLIENT_ID is required")
  if (!clientSecret) throw new Error("AUTH_CLIENT_SECRET is required")
  if (!redirectUri) throw new Error("AUTH_REDIRECT_URI is required")
  if (!cookieEncryptionKey) throw new Error("COOKIE_ENCRYPTION_KEY is required")

  return {
    issuer,
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    cookieEncryptionKey,
  }
}

export function validateConfig(config: Partial<OAuthConfig>): config is OAuthConfig {
  return !!(
    config.issuer &&
    config.clientId &&
    config.clientSecret &&
    config.redirectUri &&
    config.cookieEncryptionKey
  )
}
