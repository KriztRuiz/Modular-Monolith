# Modular Monolith

Este repositorio contiene un backend en TypeScript (Express + Mongoose) y un frontend en React + Vite.

Requisitos
- Node.js 18+
- npm
- Docker (opcional para MongoDB local)

Quickstart

1. Copia `.env.example` a `.env` y ajusta valores:
   ```bash
   cp .env.example .env
   ```

2. Levantar MongoDB local (opcional):
   ```bash
   npm run db:up
   ```

3. Instalar dependencias y arrancar backend:
   ```bash
   npm ci
   npm run dev
   ```

4. En otra terminal, arrancar frontend:
   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

Deploy
- Frontend: Vercel (workflow incluido). Añade `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` en GitHub Secrets.
- Backend: Docker / VPS (configurar según necesidad).
