import { NextRequest, NextResponse } from "next/server"
import { getConfig } from "@/lib/oauth/config"
import { exchangeCodeForTokens, parseIdTokenClaims } from "@/lib/oauth/client"
import { getAuthState, clearAuthState, setTokenCookies } from "@/lib/cookies/tokens"
import type { LoginEndResponse } from "@/lib/oauth/types"

export async function POST(
  request: NextRequest
): Promise<NextResponse<LoginEndResponse | { error: string }>> {
  try {
    const config = getConfig()
    const body = await request.json()
    const { code, state } = body

    if (!code || !state) {
      return NextResponse.json({ error: "Missing code or state parameter" }, { status: 400 })
    }

    const authState = await getAuthState(config.cookieEncryptionKey)

    if (!authState) {
      return NextResponse.json(
        { error: "No auth state found - session may have expired" },
        { status: 400 }
      )
    }

    if (authState.state !== state) {
      return NextResponse.json({ error: "State mismatch - possible CSRF attack" }, { status: 400 })
    }

    const tokens = await exchangeCodeForTokens(config, code, authState.codeVerifier)

    await setTokenCookies(tokens, config.cookieEncryptionKey)
    await clearAuthState()

    const claims = parseIdTokenClaims(tokens.idToken)

    return NextResponse.json({
      success: true,
      claims,
    })
  } catch (error) {
    console.error("Login end error:", error)
    return NextResponse.json({ error: "Failed to complete login" }, { status: 500 })
  }
}
