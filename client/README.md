# SupplyGuard dashboard (Next.js)

This directory is the **SupplyGuard** web client: map, simulation controls, disruption feed, and WebSocket connection to the API.

## Run

```bash
npm install
npm run dev
```

Configure `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` in the **repository root** `.env` to point at the Node API (defaults assume `http://localhost:3001`).

## Docs

See the **[root README](../README.md)** for architecture, graph seeding, Neo4j, and how the full stack fits together.
