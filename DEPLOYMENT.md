# ReliefLink (HCMS) – Setup, Configuration, Free-Tier Deployment & Troubleshooting Guide

## 1. Architecture Overview
- **Backend:** .NET 10 Clean Architecture (`Domain`, `Application`, `Infrastructure`, `API`, `Tests`) with Entity Framework Core 10 and Microsoft SQL Server.
- **Frontend:** React 19 + Vite 8 + Tailwind CSS v4 (JavaScript SPA in `Frontend/`).
- **Authentication & Authorization:** HS256 JWT Bearer authentication with database-backed RBAC permissions and organization-scoped memberships (`X-Organization-Id` validation).
- **Health Check:** `GET /health` (unauthenticated liveness probe returning `200 OK` `Healthy`).

---

## 2. Prerequisites
- **.NET 10 SDK** (`10.0.x`)
- **Node.js `20+`** and **npm**
- **Microsoft SQL Server** (SQL Server Express `.\SQLEXPRESS`, LocalDB, or Azure SQL Free Offer)

---

## 3. Environment Variables & Secrets Reference (Never Commit Secrets)

### Backend (`HumanitarianCrisisManagement.API`)
Supply all sensitive values via `.NET User Secrets` (local development) or platform environment variables (staging/production):

| Key (JSON / Env Var) | Required | Description |
| :--- | :---: | :--- |
| `ConnectionStrings__DefaultConnection` | Yes | SQL Server connection string |
| `Jwt__Key` | Yes | Base64-encoded signing key (minimum 32 bytes / 256 bits) |
| `Jwt__Issuer` | Yes | JWT issuer (`HumanitarianCrisisManagementAPI`) |
| `Jwt__Audience` | Yes | JWT audience (`HumanitarianCrisisManagementClient`) |
| `Jwt__AccessTokenExpirationMinutes` | No | Token lifetime in minutes (default `60`) |
| `Cors__AllowedOrigins__0` | Prod | Deployed frontend HTTPS origin (e.g., `https://your-app.vercel.app`) |
| `AiProvider__Provider` | No | `"None"` (safe default), `"Groq"`, or `"Gemini"` |
| `AiProvider__GroqApiKey` | Optional | Groq API key (free-tier compatible; never place in `appsettings.json` or frontend) |
| `AiProvider__GroqModel` | No | Default `"openai/gpt-oss-120b"` |
| `AiProvider__GroqBaseUrl` | No | Default `"https://api.groq.com/openai/v1"` |
| `AiProvider__GeminiApiKey` | Optional | Google Gemini API key (free-tier compatible) |
| `AiProvider__Model` | No | Default `"gemini-3.1-flash-lite"` |
| `AiProvider__TimeoutSeconds` | No | Default `120` (range `5..300`) |
| `AiProvider__IncludeSanitizedDescriptions` | No | Default `false` (strict privacy mode — omits free-text citizen descriptions) |

### Frontend (`Frontend/`)
Templates: [Frontend/.env.example](Frontend/.env.example) and [Frontend/.env.production.example](Frontend/.env.production.example).

| Variable | Description |
| :--- | :--- |
| `VITE_API_BASE_URL` | Backend API base URL ending with `/api` (HTTPS in production, e.g., `https://api.example.com/api`) |
| `VITE_USE_MOCK_API` | Must be `false` in live/staging/production environments |

---

## 4. Database Setup & Migrations (Authorized Environments Only)
1. Configure `ConnectionStrings:DefaultConnection` via User Secrets or environment variables.
2. Apply EF Core migrations:
   ```powershell
   dotnet ef database update `
     --project Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement/HumanitarianCrisisManagement.Infrastructure/HumanitarianCrisisManagement.Infrastructure.csproj `
     --startup-project Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement/HumanitarianCrisisManagement.API/HumanitarianCrisisManagement.API.csproj
   ```
3. Or generate an idempotent SQL script for DBA/staging review:
   ```powershell
   dotnet ef migrations script --idempotent `
     --project Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement/HumanitarianCrisisManagement.Infrastructure/HumanitarianCrisisManagement.Infrastructure.csproj `
     --startup-project Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement/HumanitarianCrisisManagement.API/HumanitarianCrisisManagement.API.csproj `
     -o artifacts_migration.sql
   ```

---

## 5. Free-Tier University Demo Deployment Options & Realistic Limitations

Do **not** assume a developer laptop's local `.\SQLEXPRESS` (`HumanitarianCrisisDB`) is reachable from cloud hosting.

### Option A — Cloud Free-Tier Split Hosting (Zero Paid Billing)
- **Frontend SPA:** **Vercel**, **Netlify**, or **Cloudflare Pages** (Free Tier).
  - Build command: `npm run build` (publish directory: `Frontend/dist`).
  - SPA client-side routing rewrites are preconfigured in [Frontend/vercel.json](Frontend/vercel.json) and [Frontend/public/_redirects](Frontend/public/_redirects).
  - Set `VITE_API_BASE_URL=https://<your-backend-host>/api` and `VITE_USE_MOCK_API=false`.
- **Backend API & SQL Server:**
  - **Azure for Students / Azure Free Account:** Deploy `.NET 10` API to **Azure App Service (Free F1)** + **Azure SQL Database Free Offer** (100,000 vCore seconds/month + 32 GB storage free, auto-pause when idle so billing stays \$0).
  - **Limitation on Container PaaS (Render / Fly.io / Koyeb Free Tiers):** Generic container free tiers do **not** provide managed Microsoft SQL Server; if using a container host for the `.NET 10` API, pair it with Azure SQL Free Offer or MonsterASP.NET Free `.NET + SQL Server` hosting.
- **Production Hardening Built In:** Setting `ASPNETCORE_ENVIRONMENT=Production` disables Swagger UI, enables `UseHttpsRedirection()`, honors `X-Forwarded-For` / `X-Forwarded-Proto` via `UseForwardedHeaders()`, and restricts CORS strictly to `Cors:AllowedOrigins`.

### Option B — Local Laptop University Live Demo (Zero Cloud Accounts Needed)
- Run SQL Server Express (`HumanitarianCrisisDB`), Kestrel (`http://localhost:5107`), and Vite (`http://localhost:5173` or `npm run preview`) locally on the presentation machine. If external mobile access is desired during the demo, expose via a free ephemeral tunnel (e.g., Cloudflare Quick Tunnel `cloudflared tunnel`) and add the tunnel origin to `Cors:AllowedOrigins`.

---

## 6. Opt-In SQL Server Staging Concurrency Verification

Automated CI/local tests in `ConcurrencyAndSecurityIsolationTests.cs` use isolated temporary SQLite databases and never connect to `HumanitarianCrisisDB`. Because SQLite locking differs from SQL Server `IsolationLevel.Serializable` key-range locking, verify SQL Server concurrency only against a **separate disposable staging database** (never `HumanitarianCrisisDB`):

```powershell
$env:HCMS_RUN_SQLSERVER_STAGING_CONCURRENCY_TESTS = "true"
$env:HCMS_STAGING_SQLSERVER_CONNECTION = "Server=.\SQLEXPRESS;Database=HCMS_Staging_Test;Trusted_Connection=True;TrustServerCertificate=True;"
dotnet test Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement/HumanitarianCrisisManagement.Tests/HumanitarianCrisisManagement.Tests.csproj -c Release --filter "FullyQualifiedName~OptInSqlServerStagingConcurrencyTests"
```
*(Safety guard: the test automatically aborts if the connection string references `HumanitarianCrisisDB`.)*

---

## 7. Post-Deployment Smoke-Test Checklist

1. **Liveness Probe:** `GET /health` returns `HTTP 200` (`Healthy`).
2. **Public Endpoints:** `GET /api/CrisisEvents`, `GET /api/Areas`, and `GET /api/Shelters?activeOnly=true` return `HTTP 200` JSON arrays; CORS preflight succeeds from the frontend origin.
3. **Authentication & RBAC:**
   - Unauthenticated `GET /api/CitizenRequests` returns `HTTP 401`.
   - Citizen login succeeds (`POST /api/Auth/login` → `200`), `GET /api/Auth/me` returns role `Citizen`, and `GET /api/AuditLogs` returns `HTTP 403`.
4. **Citizen Portal Flow:** Submit a test request in Citizen Portal, verify it appears in `ActiveRequestsTracker`, and verify a `"Request Submitted"` notification appears in `NotificationsDrawer`.
5. **Admin & Operational Flow:** Sign in as `Administrator`, verify Dashboard KPIs, AI Provider status (`GET /api/AiRecommendations/status`), Shelters, Volunteers, Warehouse Inventory, and Audit Logs load without console or network errors.

---

## 8. Troubleshooting Guide

| Symptom | Cause | Resolution |
| :--- | :--- | :--- |
| API fails at startup with `JWT signing key must contain at least 32 bytes` | Missing or short Base64 `Jwt:Key` | Generate a 32-byte Base64 key (`[Convert]::ToBase64String((1..32 \| ForEach-Object { Get-Random -Max 256 }))`) and set `Jwt:Key` in User Secrets or env vars. |
| Browser shows `Network Unavailable` or CORS error | Backend not running, wrong `VITE_API_BASE_URL`, or frontend origin missing from `Cors:AllowedOrigins` | Verify `GET /health`, ensure `VITE_API_BASE_URL` ends with `/api`, and add frontend origin to `Cors__AllowedOrigins__0`. |
| AI analysis returns `HTTP 503 Service Unavailable` | `AiProvider:Provider` is `"None"`, API key missing, or upstream Groq/Gemini transient spike | Check `GET /api/AiRecommendations/status`; configure `AiProvider:Provider` + User Secret key. Citizen requests and manual allocations remain unaffected. |
| Refreshing `/admin/*` or `/citizen` on static host returns `404` | Static host not rewriting SPA routes to `index.html` | Ensure `Frontend/vercel.json` (Vercel) or `Frontend/public/_redirects` (Netlify/Cloudflare Pages) is deployed. |
| Organization Portal member roster shows `403` notice | Signed-in member has approved membership without `Organizations.View` role | Expected RBAC behavior; assign an organization role with `Organizations.View` / `Organizations.ApproveMembers` via Admin or Org Coordinator. |
