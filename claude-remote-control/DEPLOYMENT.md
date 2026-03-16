# Deployment Guide

Self-hosted deployment of the 247 web frontend on Railway with local agents connected via Tailscale.

## Architecture

```
Railway (HTTPS)              Tailscale Serve (HTTPS)
┌──────────────────┐         ┌──────────────────────────────────┐
│  Next.js Web UI  │         │  macbook-pro.tailXXXX.ts.net:4678│
│  (stateless)     │         │  ↓                               │
└──────────────────┘         │  localhost:4678 (247 agent)      │
         │                   └──────────────────────────────────┘
         │ serves HTML/JS              ▲
         ▼                             │ wss:// (WebSocket)
    ┌─────────┐                        │
    │ Browser │────────────────────────┘
    │ (on tailnet)
    └─────────┘
```

- Railway serves the UI only — no agent runs on Railway
- Browser connects directly to agents via Tailscale Serve (HTTPS + WSS)
- All devices must be on the same Tailscale network
- Agent connections are stored in Neon PostgreSQL

## Prerequisites

- [Railway CLI](https://docs.railway.com/guides/cli) installed and authenticated
- [Tailscale](https://tailscale.com) installed on all machines (agent hosts + browsing devices)
- [Neon](https://neon.tech) database with auth configured
- Node.js 20+, pnpm 9+

## 1. Deploy Web Frontend to Railway

From the `claude-remote-control/` directory:

```bash
# Create project (first time only)
railway init --name 247-web

# Or link to existing project
railway link --project <project-name>

# Add service with env vars
railway add --service "247-web" \
  --variables "DATABASE_URL=<your-neon-connection-string>" \
  --variables "NEON_AUTH_BASE_URL=<your-neon-auth-url>" \
  --variables "RAILWAY_DOCKERFILE_PATH=Dockerfile.web" \
  --variables "PORT=3000"

# Generate a public URL
railway domain

# Deploy
railway up
```

### Redeploying after changes

```bash
cd claude-remote-control
railway up
```

## 2. Set Up Agent on a New Machine

### Start the agent

```bash
cd claude-remote-control
pnpm install
pnpm dev  # or run the agent directly
```

The agent runs on port 4678 by default.

### Expose via Tailscale Serve

```bash
# Expose agent with HTTPS on the same port (4678)
tailscale serve https:4678 / http://127.0.0.1:4678

# Verify
tailscale serve status
```

This gives you a URL like `https://<machine-name>.tailXXXX.ts.net:4678` with valid HTTPS certs, accessible only from your tailnet.

The serve config **persists across restarts** — no need to re-run.

### Add the connection

In the 247 web UI, go to connection settings and add:
- **URL:** `<machine-name>.tailXXXX.ts.net:4678`
- **Method:** Tailscale

### Multiple services on one machine

Tailscale Serve supports multiple ports:

```bash
tailscale serve https:4678 / http://127.0.0.1:4678   # agent
tailscale serve https:8443 / http://127.0.0.1:3000   # another service
tailscale serve https:10000 / http://127.0.0.1:5000  # yet another
```

## Tailscale Serve vs Funnel

| | Serve | Funnel |
|---|---|---|
| **Access** | Tailnet only | Public internet |
| **HTTPS certs** | Auto (Tailscale CA) | Auto (Let's Encrypt) |
| **Security** | Private | Public |
| **Use when** | All devices have Tailscale | Need access from devices without Tailscale |

**We use Serve** since all browsing devices are on the tailnet. To switch to Funnel:

```bash
tailscale funnel 4678 on   # expose to internet
tailscale funnel 4678 off  # back to tailnet only
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEON_AUTH_BASE_URL` | Neon Auth endpoint URL |
| `RAILWAY_DOCKERFILE_PATH` | Must be `Dockerfile.web` |
| `PORT` | `3000` (Railway internal port) |

## Neon Auth

The Railway URL must be added as an allowed origin in Neon Auth settings. Do this via the Neon dashboard under your project's Auth configuration.
