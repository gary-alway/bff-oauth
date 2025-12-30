import { cookies } from "next/headers"
import { encrypt, decrypt } from "./encryption"
import type { TokenSet, AuthState } from "@/lib/oauth/types"

const ACCESS_TOKEN_COOKIE = "at"
const REFRESH_TOKEN_COOKIE = "rt"
const AUTH_STATE_COOKIE = "auth_state"

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
}

export async function setTokenCookies(tokens: TokenSet, encryptionKey: string): Promise<void> {
  const cookieStore = await cookies()
  const atPayload = {
    accessToken: tokens.accessToken,
    idToken: tokens.idToken,
    expiresAt: tokens.expiresAt,
  }

  const encryptedAt = await encrypt(atPayload, encryptionKey)
  cookieStore.set(ACCESS_TOKEN_COOKIE, encryptedAt, {
    ...COOKIE_OPTIONS,
    maxAge: tokens.expiresAt - Math.floor(Date.now() / 1000),
  })

  if (tokens.refreshToken) {
    const rtPayload = { refreshToken: tokens.refreshToken }
    const encryptedRt = await encrypt(rtPayload, encryptionKey)
    cookieStore.set(REFRESH_TOKEN_COOKIE, encryptedRt, {
      ...COOKIE_OPTIONS,
      path: "/api/auth",
      maxAge: 60 * 60 * 24 * 7,
    })
  }
}

export async function getAccessToken(
  encryptionKey: string
): Promise<{ accessToken: string; idToken: string | null; expiresAt: number } | null> {
  const cookieStore = await cookies()
  const atCookie = cookieStore.get(ACCESS_TOKEN_COOKIE)

  if (!atCookie?.value) {
    return null
  }

  const payload = await decrypt<{ accessToken: string; idToken: string | null; expiresAt: number }>(
    atCookie.value,
    encryptionKey
  )

  return payload
}

export async function getRefreshToken(encryptionKey: string): Promise<string | null> {
  const cookieStore = await cookies()
  const rtCookie = cookieStore.get(REFRESH_TOKEN_COOKIE)

  if (!rtCookie?.value) {
    return null
  }

  const payload = await decrypt<{ refreshToken: string }>(rtCookie.value, encryptionKey)
  return payload?.refreshToken ?? null
}

export async function clearTokenCookies(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ACCESS_TOKEN_COOKIE)
  cookieStore.delete(REFRESH_TOKEN_COOKIE)
  cookieStore.delete(AUTH_STATE_COOKIE)
}

export async function setAuthState(state: AuthState, encryptionKey: string): Promise<void> {
  const cookieStore = await cookies()
  const payload: Record<string, unknown> = {
    codeVerifier: state.codeVerifier,
    state: state.state,
    ...(state.returnTo && { returnTo: state.returnTo }),
  }
  const encrypted = await encrypt(payload, encryptionKey)
  cookieStore.set(AUTH_STATE_COOKIE, encrypted, {
    ...COOKIE_OPTIONS,
    maxAge: 60 * 10,
  })
}

export async function getAuthState(encryptionKey: string): Promise<AuthState | null> {
  const cookieStore = await cookies()
  const stateCookie = cookieStore.get(AUTH_STATE_COOKIE)

  if (!stateCookie?.value) {
    return null
  }

  return decrypt<AuthState>(stateCookie.value, encryptionKey)
}

export async function clearAuthState(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_STATE_COOKIE)
}
