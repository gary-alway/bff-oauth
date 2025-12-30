"use client"

import { useState, useEffect, useCallback } from "react"
import type {
  SessionInfo,
  LoginStartResponse,
  LoginEndResponse,
  LogoutResponse,
} from "@/lib/oauth/types"

interface UseSessionReturn {
  session: SessionInfo | null
  isLoading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  handleCallback: (code: string, state: string) => Promise<LoginEndResponse>
  refresh: () => Promise<void>
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session")
      const data: SessionInfo = await response.json()
      setSession(data)
    } catch {
      setSession({ isLoggedIn: false, claims: null })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  const login = useCallback(async () => {
    const response = await fetch("/api/auth/login/start", { method: "POST" })
    const data: LoginStartResponse = await response.json()
    window.location.href = data.authorizationUrl
  }, [])

  const handleCallback = useCallback(
    async (code: string, state: string): Promise<LoginEndResponse> => {
      const response = await fetch("/api/auth/login/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, state }),
      })
      const data: LoginEndResponse = await response.json()

      if (data.success) {
        await fetchSession()
      }

      return data
    },
    [fetchSession]
  )

  const logout = useCallback(async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" })
    const data: LogoutResponse = await response.json()

    setSession({ isLoggedIn: false, claims: null })

    if (data.logoutUrl) {
      window.location.href = data.logoutUrl
    }
  }, [])

  const refresh = useCallback(async () => {
    const response = await fetch("/api/auth/refresh", { method: "POST" })

    if (response.ok) {
      await fetchSession()
    }
  }, [fetchSession])

  return {
    session,
    isLoading,
    login,
    logout,
    handleCallback,
    refresh,
  }
}
