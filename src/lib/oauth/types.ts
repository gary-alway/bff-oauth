export interface OAuthConfig {
  issuer: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
  cookieEncryptionKey: string
}

export interface TokenSet {
  accessToken: string
  refreshToken: string | null
  idToken: string | null
  expiresAt: number
}

export interface SessionInfo {
  isLoggedIn: boolean
  claims: IdTokenClaims | null
}

export interface IdTokenClaims {
  sub: string
  name?: string
  email?: string
  [key: string]: unknown
}

export interface LoginStartResponse {
  authorizationUrl: string
}

export interface LoginEndRequest {
  code: string
  state: string
  iss?: string
}

export interface LoginEndResponse {
  success: boolean
  claims: IdTokenClaims | null
}

export interface LogoutResponse {
  logoutUrl: string | null
}

export interface AuthState {
  codeVerifier: string
  state: string
  returnTo?: string
}
