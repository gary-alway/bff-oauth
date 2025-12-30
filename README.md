# BFF OAuth

A Backend for Frontend (BFF) OAuth implementation following Zero Trust principles.

## The Pattern

Browser-based apps are public clients - they can't securely store secrets. Traditional approaches store tokens in localStorage or regular cookies, both accessible via JavaScript and vulnerable to XSS attacks. The BFF pattern solves this by keeping tokens server-side in encrypted HTTP-only cookies, making them invisible to JavaScript entirely.

```mermaid
sequenceDiagram
    participant Browser
    participant BFF as BFF OAuth Client
    participant Auth as Auth Server

    Browser->>BFF: POST /login/start
    BFF-->>Browser: Authorization URL
    Browser->>Auth: Redirect to authorize
    Auth-->>Browser: Redirect with code
    Browser->>BFF: POST /login/end {code, state}
    BFF->>Auth: Exchange code for tokens
    Auth-->>BFF: AT, RT, ID Token
    BFF->>BFF: Encrypt tokens
    BFF-->>Browser: Set HTTP-only cookies
    Browser->>BFF: GET /session
    BFF-->>Browser: {isLoggedIn, claims}
```

## Security Features

- **PKCE** - Protects authorization code flow
- **Encrypted cookies** - Tokens encrypted with AES-256-GCM
- **HTTP-only + Secure + SameSite=Strict** - XSS and CSRF protection
- **Confidential client** - Server holds client_secret
- **State parameter** - CSRF protection for OAuth flow

## Architecture

```mermaid
graph LR
    subgraph Browser
        A[React App]
    end
    subgraph "Next.js (Same Origin)"
        B[Pages]
        C[BFF API Routes]
    end
    subgraph External
        D[Auth Provider]
    end

    A -->|fetch| C
    C -->|OIDC| D
    C -->|encrypted cookies| A
```

## Run

```bash
yarn dev
```

- App: http://localhost:3000
- Mock OIDC discovery: http://localhost:9000/.well-known/openid-configuration

## Test

```bash
yarn test          # unit tests
yarn test:e2e      # playwright (requires yarn dev running)
```