# CLAUDE.md — roommanager

## Cloudflare Deployment

- **Platform**: Cloudflare Pages
- **Project name**: `roommanager`
- **Production branch**: `main`
- **Build**: `npm run build`
- **Build output**: `dist`
- **Deploy command**: `wrangler pages deploy dist --project-name=roommanager --branch=main`
- **Resources**: KV Namespace (ROOMMANAGER_PIN_STORE)

> 배포 시 반드시 `--branch=main`을 명시하세요.
