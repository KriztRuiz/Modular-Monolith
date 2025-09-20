# GitHub Secrets required

Add the following secrets to your repository (Settings → Secrets → Actions):

- VERCEL_TOKEN — token to allow Vercel Action to deploy
- VERCEL_ORG_ID — Vercel organization id
- VERCEL_PROJECT_ID — Vercel project id
- MONGO_URL — (if using remote MongoDB in CI)
- JWT_SECRET — keep this in secrets if you do deployments

Optional:
- DOCKERHUB_USERNAME / DOCKERHUB_TOKEN — if pushing Docker images

How to get Vercel IDs
- Vercel dashboard → Project → Settings → General

