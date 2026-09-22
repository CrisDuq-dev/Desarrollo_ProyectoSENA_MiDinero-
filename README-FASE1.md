# Mi Dinero+ — Fase 1 (Seguridad y estructura)

## Arranque rápido

### 1. Base de datos
En MySQL Workbench / XAMPP ejecuta:

```
mi-dinero-plus-api/migrations/001_refresh_tokens.sql
```

(si la BD es nueva, puedes usar `schema.sql` completo).

### 2. Backend
```bash
cd mi-dinero-plus-api
cp .env.example .env   # completa JWT_SECRET, DB_*, Google, Groq, Resend
npm install            # instala cookie-parser y el resto
npm run dev            # http://localhost:4000
```

Variables nuevas en `.env`:
- `JWT_EXPIRES_IN=15m`
- `REFRESH_TOKEN_DAYS=30`

### 3. Frontend
```bash
cd mi-dinero-plus
# No uses VITE_API_URL apuntando a :4000; el proxy de Vite usa /api
npm install
npm run dev            # http://localhost:5173
```

## Cambios de seguridad (Fase 1)
- JWT en cookie httpOnly (no localStorage)
- Access 15 min + refresh 30 días con rotación
- Google OAuth con código de un solo uso (sin token en URL)
- Proxy Vite `/api` → backend
- `.gitignore` en API protege `.env`
- Sin log de `GROQ_API_KEY`
- `/` siempre es Welcome; Dashboard en `/dashboard` + botón "Continuar como..."

## Estructura
- `mi-dinero-plus/` — React 19 + Vite
- `mi-dinero-plus-api/` — Express 5 + MySQL
