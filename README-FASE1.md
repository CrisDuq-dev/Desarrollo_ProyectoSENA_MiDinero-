# Mi Dinero+

Aplicación web de **finanzas personales**: registra ingresos y gastos, define metas de ahorro, controla tus deudas, recibe reportes por correo y consulta un asistente financiero con IA.

Proyecto desarrollado por **Cristian Camilo Duque Franco** como parte de la formación en Análisis y Desarrollo de Software (ADSO) del SENA, y evolucionado como proyecto profesional.

| | |
|---|---|
| **Aplicación en línea** | https://mi-dinero-plus.vercel.app |
| **API (Render)** | https://mi-dinero-plus.onrender.com |
| **Base de datos** | MySQL compatible (TiDB Cloud Starter en producción, XAMPP en local) |
| **Repositorio** | https://github.com/CrisDuq-dev/Desarrollo_ProyectoSENA_MiDinero- |

> La API está en un plan gratuito de Render: tras un rato de inactividad, la primera petición puede tardar unos segundos en responder.

---

## Tabla de contenido

1. [Funcionalidades](#funcionalidades)
2. [Tecnologías](#tecnologías)
3. [Arquitectura](#arquitectura)
4. [Estructura del repositorio](#estructura-del-repositorio)
5. [Requisitos](#requisitos)
6. [Instalación y ejecución local](#instalación-y-ejecución-local)
7. [Variables de entorno](#variables-de-entorno)
8. [Base de datos](#base-de-datos)
9. [Endpoints de la API](#endpoints-de-la-api)
10. [Despliegue en producción](#despliegue-en-producción)
11. [Seguridad](#seguridad)
12. [Solución de problemas](#solución-de-problemas)
13. [Mejoras futuras](#mejoras-futuras)
14. [Autor](#autor)

---

## Funcionalidades

**Cuenta y sesión**
- Registro e inicio de sesión con correo y contraseña.
- Inicio de sesión con Google (OAuth 2.0).
- Verificación de correo y recuperación de contraseña.
- Sesión con token de acceso de corta duración y *refresh token* en cookies `httpOnly`.
- Cierre de sesión por inactividad y pantallas de bienvenida y despedida.

**Módulos financieros**
- **Tablero:** resumen de tu situación y tasas de referencia de divisas (USD y EUR en COP).
- **Transacciones:** crear, consultar, editar y eliminar ingresos y gastos, con búsqueda y selector de fecha.
- **Metas de ahorro:** crear metas, registrar aportes, editar y eliminar.
- **Deudas:** registrar deudas, abonar pagos, editar y eliminar.
- **Centro de actividad:** historial y notificaciones, con marcado de leídas.
- **Perfil:** datos del usuario, avatar editable (DiceBear), configuración, cambio de contraseña y curva de impulso con tu progreso.

**Mundo Plus**
- Artículos de educación financiera.
- Asistente financiero con IA (Groq).
- Minijuego «Atrapa ahorros».

**Reportes**
- Reporte semanal y mensual con vista previa.
- Envío por correo (Resend) y exportación a Excel.
- Envío automático programado con `node-cron`: lunes a las 8:00 (semanal) y día 1 de cada mes a las 8:00 (mensual).

---

## Tecnologías

| Capa | Herramientas |
|---|---|
| Front-end | React 19, Vite, React Router 7, Recharts, React Icons, ESLint |
| Back-end | Node.js (>= 20), Express 5, Passport (Google OAuth 2.0), JWT, bcryptjs |
| Seguridad | Helmet, CORS con lista de orígenes, express-rate-limit, cookie-parser |
| Base de datos | MySQL 8+ vía `mysql2` (TiDB Cloud Starter en producción) |
| Servicios | Resend (correo), Groq (IA), ExcelJS (reportes) |
| Despliegue | Vercel (front-end), Render (API), TiDB Cloud (BD) |
| Control de versiones | Git y GitHub |

---

## Arquitectura

```
 Navegador
     │  https://mi-dinero-plus.vercel.app
     ▼
┌──────────────────────┐   /api/*  (rewrite en vercel.json)   ┌──────────────────────┐        ┌──────────────────┐
│  Front-end (Vercel)  │ ───────────────────────────────────► │  API Express (Render) │ ─────► │ MySQL / TiDB     │
│  React + Vite        │ ◄─────────────────────────────────── │  Node.js              │ ◄───── │ (TiDB Cloud)     │
└──────────────────────┘        JSON + cookies httpOnly       └──────────────────────┘        └──────────────────┘
                                                                  │          │
                                                              Resend      Groq
                                                              (correo)    (IA)
```

- El front-end siempre llama a rutas relativas `/api/...`. En desarrollo las atiende el **proxy de Vite**; en producción, los **rewrites de Vercel** las envían a Render. Así navegador y API comparten origen y las cookies `httpOnly` funcionan sin problemas.
- La API sigue una organización por capas: `routes` → `controllers` → `services` / `config` (base de datos), con `middlewares` para autenticación.

---

## Estructura del repositorio

```
.
├── mi-dinero-plus/                 # Front-end (React + Vite)
│   ├── public/                     # Íconos, cursores personalizados, manifest
│   ├── src/
│   │   ├── components/             # auth, common, game, layout, ui
│   │   ├── contexts/               # AuthContext, FinanceContext, ThemeContext
│   │   ├── pages/                  # auth, dashboard, transactions, goals,
│   │   │                           # debts, mundo-plus, profile
│   │   ├── services/               # api.js (cliente HTTP), fxHistory.js
│   │   ├── constants/ data/ hooks/ utils/
│   │   └── App.jsx, main.jsx
│   ├── vercel.json                 # Cabeceras de seguridad + rewrites a la API
│   └── vite.config.js              # Proxy /api en desarrollo
│
├── mi-dinero-plus-api/             # Back-end (Node.js + Express)
│   ├── server.js                   # Punto de entrada
│   ├── schema.sql                  # Esquema completo de la base de datos
│   ├── migrations/                 # Migraciones incrementales (SQL)
│   ├── .env.example                # Plantilla de variables de entorno
│   └── src/
│       ├── app.js                  # Middlewares globales y montaje de rutas
│       ├── config/                 # db.js, passportGoogle.js
│       ├── routes/  controllers/   # auth, transactions, goals, debts,
│       │                           # activities, profile, reports, ai
│       ├── middlewares/            # authMiddleware.js
│       ├── services/               # correo, Excel, reportes, tokens, OAuth
│       └── jobs/                   # reportJobs.js (tareas programadas)
│
└── package.json                    # Scripts de conveniencia en la raíz
```

---

## Requisitos

- [Node.js](https://nodejs.org/) 20 o superior y npm.
- MySQL 8+ (por ejemplo con [XAMPP](https://www.apachefriends.org/) y MySQL Workbench).
- Git.
- Opcional, según las funciones que quieras probar: credenciales de Google OAuth, API key de Groq y API key de Resend.

---

## Instalación y ejecución local

### 1. Clonar el repositorio

```bash
git clone https://github.com/CrisDuq-dev/Desarrollo_ProyectoSENA_MiDinero-.git
cd Desarrollo_ProyectoSENA_MiDinero-
```

### 2. Crear la base de datos

1. Inicia **MySQL** desde XAMPP.
2. Abre MySQL Workbench (o phpMyAdmin) y ejecuta el archivo `mi-dinero-plus-api/schema.sql`. Crea la base `mi_dinero_plus` y todas sus tablas.

### 3. Configurar y arrancar el back-end

```bash
cd mi-dinero-plus-api
npm install
cp .env.example .env      # en Windows: copy .env.example .env
```

Edita `.env` (ver [Variables de entorno](#variables-de-entorno)) y arranca:

```bash
npm run dev
```

La API queda escuchando en `http://localhost:<PORT>`.

### 4. Arrancar el front-end

En otra terminal:

```bash
cd mi-dinero-plus
npm install
npm run dev
```

Abre http://localhost:5173.

> **Importante:** el proxy de `mi-dinero-plus/vite.config.js` apunta a `http://localhost:5000`. El `PORT` de tu `.env` debe coincidir con ese puerto (o debes cambiar el `target` del proxy). Si usas `PORT=4000`, actualiza también `GOOGLE_CALLBACK_URL`.

### Scripts disponibles

| Ubicación | Comando | Descripción |
|---|---|---|
| `mi-dinero-plus-api` | `npm run dev` / `npm start` | Inicia la API |
| `mi-dinero-plus` | `npm run dev` | Servidor de desarrollo de Vite |
| `mi-dinero-plus` | `npm run build` | Genera el build de producción en `dist/` |
| `mi-dinero-plus` | `npm run preview` | Sirve el build localmente |
| `mi-dinero-plus` | `npm run lint` | Revisa el código con ESLint |

---

## Variables de entorno

Se configuran en `mi-dinero-plus-api/.env` (nunca se sube a Git; usa `.env.example` como plantilla).

| Variable | Descripción | Ejemplo (local) |
|---|---|---|
| `PORT` | Puerto de la API | `5000` |
| `NODE_ENV` | Entorno | `development` / `production` |
| `TRUST_PROXY_HOPS` | Proxies delante de Node (en Render, `1`) | `1` |
| `DB_HOST` | Host de MySQL | `127.0.0.1` |
| `DB_USER` | Usuario de la BD | `root` |
| `DB_PASSWORD` | Contraseña de la BD | *(vacía en XAMPP)* |
| `DB_NAME` | Nombre de la BD | `mi_dinero_plus` |
| `DB_PORT` | Puerto de la BD (TiDB: `4000`) | `3306` |
| `DB_SSL` | TLS obligatorio en TiDB; en local `false` | `false` |
| `JWT_SECRET` | Secreto de firma (mínimo 32 caracteres) | *(cadena larga y aleatoria)* |
| `JWT_EXPIRES_IN` | Duración del token de acceso | `15m` |
| `REFRESH_TOKEN_DAYS` | Duración del refresh token | `30` |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma | `http://localhost:5173` |
| `FRONTEND_URL` | URL del front-end | `http://localhost:5173` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciales de Google OAuth | — |
| `GOOGLE_CALLBACK_URL` | Callback de Google | `http://localhost:<PORT>/api/auth/google/callback` |
| `GROQ_API_KEY` / `GROQ_MODEL` | Asistente de IA | `openai/gpt-oss-20b` |
| `RESEND_API_KEY` / `MAIL_FROM` | Envío de correos | `MiDinero+ <onboarding@resend.dev>` |

Para generar un `JWT_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Base de datos

El esquema está en `mi-dinero-plus-api/schema.sql` (charset `utf8mb4`) y contiene estas tablas:

| Tabla | Propósito |
|---|---|
| `users` | Cuentas de usuario |
| `user_profiles` | Perfil y preferencias |
| `simulation_settings` | Configuración de simulación |
| `transactions` | Ingresos y gastos |
| `savings_goals` / `savings_goal_contributions` | Metas de ahorro y sus aportes |
| `debts` / `debt_payments` | Deudas y sus pagos |
| `financial_activities` | Centro de actividad y notificaciones |
| `refresh_tokens` | Sesiones renovables |

Las migraciones incrementales viven en `mi-dinero-plus-api/migrations/` (por ejemplo `001_refresh_tokens.sql`).

---

## Endpoints de la API

Todas las rutas cuelgan de `/api`. Excepto las de autenticación pública, requieren sesión válida.

| Recurso | Método y ruta | Acción |
|---|---|---|
| **Auth** | `POST /auth/register` · `POST /auth/login` | Registro e inicio de sesión |
| | `POST /auth/refresh` · `POST /auth/logout` | Renovar y cerrar sesión |
| | `POST /auth/verify-email` · `POST /auth/resend-verification` | Verificación de correo |
| | `POST /auth/forgot-password` · `POST /auth/reset-password` | Recuperar contraseña |
| | `GET /auth/google` · `POST /auth/google/exchange` | Inicio con Google |
| **Transacciones** | `GET /transactions` · `POST /transactions` | Listar y crear |
| | `PUT /transactions/:id` · `DELETE /transactions/:id` | Editar y eliminar |
| **Metas** | `GET /goals` · `POST /goals` | Listar y crear |
| | `PUT /goals/:id` · `DELETE /goals/:id` | Editar y eliminar |
| | `POST /goals/:id/contribute` | Registrar aporte |
| **Deudas** | `GET /debts` · `POST /debts` | Listar y crear |
| | `PUT /debts/:id` · `DELETE /debts/:id` | Editar y eliminar |
| | `POST /debts/:id/pay` | Registrar pago |
| **Actividad** | `GET /activities` · `GET /activities/unread` | Consultar |
| | `PATCH /activities/read-all` · `PATCH /activities/:id/read` | Marcar como leídas |
| | `DELETE /activities/:id` · `DELETE /activities/clear` | Eliminar |
| **Perfil** | `GET /profile` | Obtener perfil |
| | `PUT /profile/profile` · `/settings` · `/user` · `/password` | Actualizar datos |
| | `POST /profile/reset-simulation` | Reiniciar simulación |
| **Reportes** | `GET /reports/preview-weekly` | Vista previa semanal |
| | `POST /reports/send-weekly` · `POST /reports/send-monthly` | Enviar por correo |
| | `GET /reports/download/:type` | Descargar Excel |
| **IA** | `POST /ai/advice` · `POST /ai/mundo-plus` | Asistente financiero |

---

## Despliegue en producción

La aplicación está desplegada con tres servicios gratuitos.

### 1. Base de datos: TiDB Cloud Starter

1. Crea una instancia Starter (plan gratuito, con límite de gasto en $0).
2. Ejecuta `schema.sql` sobre la instancia.
3. Guarda host, usuario, contraseña y puerto (`4000`). La conexión exige TLS: usa `DB_SSL=true`.

### 2. API: Render

1. Crea un *Web Service* conectado al repositorio de GitHub.
2. **Root Directory:** `mi-dinero-plus-api` · **Build Command:** `npm install` · **Start Command:** `npm start`.
3. Define las variables de entorno de la tabla anterior con valores de producción:
   - `NODE_ENV=production`, `TRUST_PROXY_HOPS=1`, `DB_SSL=true`, `DB_PORT=4000`.
   - `CORS_ORIGIN` y `FRONTEND_URL` = `https://mi-dinero-plus.vercel.app`.
   - `GOOGLE_CALLBACK_URL` = `https://mi-dinero-plus.vercel.app/api/auth/google/callback`.

### 3. Front-end: Vercel

1. Importa el repositorio y define **Root Directory** = `mi-dinero-plus` (Framework: Vite).
2. `vercel.json` ya incluye las cabeceras de seguridad y los *rewrites*: `/api/*` hacia Render y el resto a `index.html` (SPA).
3. Si cambias la URL de la API en Render, actualiza el `destination` en `mi-dinero-plus/vercel.json`.

### Google OAuth

En Google Cloud Console agrega como URI de redirección autorizada el valor de `GOOGLE_CALLBACK_URL` de cada entorno (local y producción).

---

## Seguridad

- Consultas SQL **parametrizadas** en todo el back-end.
- Autorización por `user_id` en actualizaciones y eliminaciones (previene acceso a datos de otros usuarios).
- Tokens JWT firmados con HS256 y secreto de mínimo 32 caracteres; tokens de acceso de 15 minutos con *refresh token* rotativo y cookies `httpOnly`; sin tokens en `localStorage`.
- Inicio con Google mediante código de un solo uso intercambiado por `POST`, sin exponer el JWT en la URL.
- Contraseñas con hash (bcrypt) y mitigación de ataques de temporización en el login.
- Respuestas uniformes en recuperación de contraseña para no revelar qué correos existen.
- Helmet, CORS con lista de orígenes permitidos, límites de peticiones diferenciados por ruta y tamaño máximo de cuerpo de 32 KB.
- Cabeceras de seguridad adicionales en Vercel (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`).
- Archivos `.env` excluidos de Git mediante `.gitignore`.

> Si alguna vez compartes el proyecto con el `.env` incluido, rota las claves (JWT, base de datos, Google, Groq, Resend).

---

## Solución de problemas

| Problema | Posible causa y solución |
|---|---|
| El front no conecta con la API en local | El puerto del proxy en `vite.config.js` (5000) no coincide con el `PORT` del `.env`. |
| Error de CORS («Origen no permitido») | Agrega el origen exacto del front a `CORS_ORIGIN`. |
| Error de conexión a la BD en producción | Revisa `DB_HOST`, `DB_PORT=4000` y `DB_SSL=true` (TiDB exige TLS). |
| La sesión se pierde en producción | Verifica que el front llame a `/api` relativo y que los rewrites de `vercel.json` apunten a la API correcta. |
| El inicio con Google falla | Confirma que `GOOGLE_CALLBACK_URL` esté registrada en Google Cloud Console. |
| No llegan correos | Revisa `RESEND_API_KEY` y `MAIL_FROM` (con `onboarding@resend.dev` solo se puede enviar a tu propio correo registrado). |
| Primera carga lenta en producción | Render gratuito «duerme» la API tras inactividad; espera unos segundos. |

---

## Mejoras futuras

- Dominio propio para la aplicación.
- Pruebas automatizadas del front-end y de la API.
- Revocación de sesiones desde el perfil.
- Más reportes y gráficas personalizables.

---

## Autor

**Cristian Camilo Duque Franco**
Desarrollador de software Full Stack Junior · Aprendiz ADSO, SENA
Correo: cristian.duquefranco@gmail.com
GitHub: [CrisDuq-dev](https://github.com/CrisDuq-dev)

Proyecto académico y profesional en desarrollo.