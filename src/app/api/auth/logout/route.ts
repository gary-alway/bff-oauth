import { NextResponse } from "next/server"
import { getConfig } from "@/lib/oauth/config"
import { buildLogoutUrl } from "@/lib/oauth/client"
import { getAccessToken, clearTokenCookies } from "@/lib/cookies/tokens"
import { parseIdTokenClaims } from "@/lib/oauth/client"
import type { LogoutResponse } from "@/lib/oauth/types"

export async function POST(): Promise<NextResponse<LogoutResponse | { error: string }>> {
  try {
    const config = getConfig()
    const tokenData = await getAccessToken(config.cookieEncryptionKey)

    let logoutUrl: string | null = null

    if (tokenData?.idToken) {
      const claims = parseIdTokenClaims(tokenData.idToken)
      if (claims) {
        logoutUrl = await buildLogoutUrl(config, tokenData.idToken)
      }
    }

    await clearTokenCookies()

    return NextResponse.json({ logoutUrl })
  } catch (error) {
    console.error("Logout error:", error)
    await clearTokenCookies()
    return NextResponse.json({ logoutUrl: null })
  }
}
