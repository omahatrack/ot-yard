# OTE Equipment Hub v32

GoDaddy production startup fix.

- Preserves v31 production-build validation/self-healing.
- Uses configured `SESSION_SECRET` when present.
- If GoDaddy production omits `SESSION_SECRET`, startup generates a cryptographically strong runtime secret before database/build/server startup so the site remains healthy.
- A permanent GoDaddy `SESSION_SECRET` is still recommended so signed-in sessions survive restarts/deployments.
