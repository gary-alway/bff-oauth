import { NextResponse } from "next/server"
import { getConfig } from "@/lib/oauth/config"
import { getAccessToken } from "@/lib/cookies/tokens"
import { parseIdTokenClaims } from "@/lib/oauth/client"
import type { SessionInfo } from "@/lib/oauth/types"

export async function GET(): Promise<NextResponse<SessionInfo>> {
  try {
    const config = getConfig()
    const tokenData = await getAccessToken(config.cookieEncryptionKey)

    if (!tokenData) {
      return NextResponse.json({
        isLoggedIn: false,
        claims: null,
      })
    }

    const now = Math.floor(Date.now() / 1000)
    if (tokenData.expiresAt < now) {
      return NextResponse.json({
        isLoggedIn: false,
        claims: null,
      })
    }

    const claims = parseIdTokenClaims(tokenData.idToken)

    return NextResponse.json({
      isLoggedIn: true,
      claims,
    })
  } catch (error) {
    console.error("Session error:", error)
    return NextResponse.json({
      isLoggedIn: false,
      claims: null,
    })
  }
}
