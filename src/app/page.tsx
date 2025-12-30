"use client"

import { useSession } from "@/lib/hooks/useSession"
import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"

export default function Home() {
  const { session, isLoading, login, logout, handleCallback } = useSession()
  const searchParams = useSearchParams()
  const [callbackError, setCallbackError] = useState<string | null>(null)
  const [isProcessingCallback, setIsProcessingCallback] = useState(false)
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return

    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      processedRef.current = true
      const errorDesc = searchParams.get("error_description") || error
      queueMicrotask(() => setCallbackError(errorDesc))
      return
    }

    if (code && state) {
      processedRef.current = true
      queueMicrotask(() => setIsProcessingCallback(true))

      handleCallback(code, state)
        .then((result) => {
          if (!result.success) {
            setCallbackError("Failed to complete login")
          }
          window.history.replaceState({}, "", "/")
        })
        .catch(() => {
          setCallbackError("Failed to complete login")
        })
        .finally(() => {
          setIsProcessingCallback(false)
        })
    }
  }, [searchParams, handleCallback])

  if (isLoading || isProcessingCallback) {
    return (
      <main style={styles.main}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>
            {isProcessingCallback ? "Completing login..." : "Loading..."}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.title}>BFF OAuth Demo</h1>

        {callbackError ? (
          <div style={styles.error}>
            <p>{callbackError}</p>
            <button onClick={() => setCallbackError(null)} style={styles.buttonSecondary}>
              Dismiss
            </button>
          </div>
        ) : null}

        {session?.isLoggedIn ? (
          <div style={styles.sessionInfo}>
            <div style={styles.avatar}>{session.claims?.name?.charAt(0).toUpperCase() || "U"}</div>
            <h2 style={styles.welcome}>Welcome, {session.claims?.name || "User"}</h2>
            {session.claims?.email ? <p style={styles.email}>{session.claims.email}</p> : null}

            <div style={styles.claimsSection}>
              <h3 style={styles.claimsTitle}>ID Token Claims</h3>
              <pre style={styles.claims}>{JSON.stringify(session.claims, null, 2)}</pre>
            </div>

            <button onClick={logout} style={styles.button}>
              Sign Out
            </button>
          </div>
        ) : (
          <button onClick={login} style={styles.button}>
            Sign In
          </button>
        )}
      </div>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    padding: "20px",
  },
  card: {
    background: "rgba(255, 255, 255, 0.03)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "24px",
    padding: "48px",
    maxWidth: "480px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#e94560",
    margin: "0 0 8px 0",
    fontFamily: "'JetBrains Mono', monospace",
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "rgba(255, 255, 255, 0.5)",
    margin: "0 0 32px 0",
    textTransform: "uppercase",
    letterSpacing: "2px",
  },
  button: {
    background: "linear-gradient(135deg, #e94560 0%, #c23a51 100%)",
    color: "#fff",
    border: "none",
    padding: "16px 32px",
    borderRadius: "12px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 4px 14px rgba(233, 69, 96, 0.4)",
  },
  buttonSecondary: {
    background: "transparent",
    color: "rgba(255, 255, 255, 0.7)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "0.85rem",
    cursor: "pointer",
    marginTop: "12px",
  },
  sessionInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  avatar: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #e94560 0%, #c23a51 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "2rem",
    fontWeight: 700,
    color: "#fff",
  },
  welcome: {
    fontSize: "1.5rem",
    color: "#fff",
    margin: 0,
  },
  email: {
    color: "rgba(255, 255, 255, 0.6)",
    margin: 0,
  },
  claimsSection: {
    width: "100%",
    marginTop: "16px",
    marginBottom: "8px",
  },
  claimsTitle: {
    fontSize: "0.8rem",
    color: "rgba(255, 255, 255, 0.5)",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: "8px",
  },
  claims: {
    background: "rgba(0, 0, 0, 0.3)",
    borderRadius: "8px",
    padding: "16px",
    fontSize: "0.75rem",
    color: "#4ade80",
    textAlign: "left",
    overflow: "auto",
    maxHeight: "200px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  error: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "24px",
    color: "#fca5a5",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid rgba(255, 255, 255, 0.1)",
    borderTop: "3px solid #e94560",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 16px",
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.6)",
  },
}
