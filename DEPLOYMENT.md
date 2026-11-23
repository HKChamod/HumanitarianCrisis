# ReliefLink (HCMS) – Setup, Configuration & Deployment Guide

## 1. Architecture Overview
- **Backend:** .NET 10 Clean Architecture (`Domain`, `Application`, `Infrastructure`, `API`, `Tests`) with Entity Framework Core 10 and SQL Server.
- **Frontend:** React 19 + Vite + Tailwind CSS (`Frontend/`).
- **Authentication & Authorization:** JWT Bearer authentication with database-backed RBAC permissions and organization-scoped memberships.
- **Health Check:** `GET /health` (unauthenticated liveness probe for hosting platforms).

---

## 2. Prerequisites
- .NET 10 SDK (`10.0.x`)
- Node.js `20+` and npm
- SQL Server (LocalDB / SQL Server Express / Azure SQL Free Tier)

---

## 3. Environment Variables & Secrets Reference (No Secrets Committed)

### Backend (`HumanitarianCrisisManagement.API`)
Supply all sensitive values via `.NET User Secrets` (local dev) or hosting platform environment variables (production):

| Key (JSON / Env Var) | Required | Description |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | Yes | SQL Server connection string |
| `Jwt__Key` | Yes | Base64-encoded signing key (at least 32 bytes / 256 bits) |
| `Jwt__Issuer` | Yes | JWT issuer (default `HumanitarianCrisisManagementAPI`) |
| `Jwt__Audience` | Yes | JWT audience (default `HumanitarianCrisisManagementClient`) |
| `Jwt__AccessTokenExpirationMinutes` | No | Token lifetime in minutes (default `60`) |
| `Cors__AllowedOrigins__0` | Prod | Deployed frontend HTTPS origin(s) |
| `AiProvider__Provider` | No | `"None"` (default safe fallback) or `"Gemini"` |
| `AiProvider__GeminiApiKey` | Optional | Google Gemini API key (never place in `appsettings.json` or frontend) |
| `AiProvider__Model` | No | Default `"gemini-3.1-flash-lite"` |
| `AiProvider__TimeoutSeconds` | No | Default `120` (range `5..300`) |
| `AiProvider__IncludeSanitizedDescriptions` | No | Default `false` (strict privacy mode — omits free-text descriptions) |

### Frontend (`Frontend/`)
See [Frontend/.env.example](Frontend/.env.example) and [Frontend/.env.production.example](Frontend/.env.production.example):

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL ending with `/api` (HTTPS in production, no `localhost`) |
| `VITE_USE_MOCK_API` | Must be `false` in live/production environments |

---

## 4. Database Setup & Migrations
1. Configure `ConnectionStrings:DefaultConnection` in User Secrets or environment variables.
2. Apply EF Core migrations:
   ```powershell
   dotnet ef database update `
     --project Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement/HumanitarianCrisisManagement.Infrastructure/HumanitarianCrisisManagement.Infrastructure.csproj `
     --startup-project Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement/HumanitarianCrisisManagement.API/HumanitarianCrisisManagement.API.csproj
   ```
3. Verify zero pending model changes:
   ```powershell
   dotnet ef migrations has-pending-model-changes `
     --project Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement/HumanitarianCrisisManagement.Infrastructure/HumanitarianCrisisManagement.Infrastructure.csproj `
     --startup-project Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement/HumanitarianCrisisManagement.API/HumanitarianCrisisManagement.API.csproj
   ```

---

## 5. Build & Run Locally

### Backend
```powershell
dotnet build Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement/HumanitarianCrisisManagement.sln -c Release
dotnet test Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement/HumanitarianCrisisManagement.Tests/HumanitarianCrisisManagement.Tests.csproj
dotnet run --project Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement/HumanitarianCrisisManagement.API/HumanitarianCrisisManagement.API.csproj --urls http://localhost:5107
```

### Frontend
```powershell
cd Frontend
npm install
npm run dev
# Production build:
npm run build
```

---

## 6. Free-Tier Deployment Guide
- **Backend API:** Deploy to a reverse-proxied .NET 10 host (e.g., Azure App Service Free F1, Render Web Service, or Railway).
  - `ASPNETCORE_ENVIRONMENT=Production` automatically disables Swagger UI, enforces `UseHttpsRedirection()`, respects `X-Forwarded-For` / `X-Forwarded-Proto` via `UseForwardedHeaders()`, and restricts CORS strictly to `Cors:AllowedOrigins`.
  - Configure `GET /health` as the platform health check path.
- **Database:** Azure SQL Database Free Offer or SQL Server Express. Run `dotnet ef database update` (or generate an idempotent SQL script via `dotnet ef migrations script --idempotent`) before starting production traffic.
- **Frontend SPA:** Deploy `Frontend/dist` to Vercel, Netlify, or Cloudflare Pages (Free Tier).
  - SPA fallback routing is preconfigured via [Frontend/vercel.json](Frontend/vercel.json) and [Frontend/public/_redirects](Frontend/public/_redirects).
  - Set `VITE_API_BASE_URL` to your deployed HTTPS backend `/api` URL and `VITE_USE_MOCK_API=false`.

---

## 7. Roles & Core Workflows
- **Administrator:** Full access across Crises, Citizen Requests, Organizations, Users/Roles/Permissions, Warehouses/Inventory/Allocations, Shelters, Volunteers, Donations, Reports/Dashboard, Notifications, Audit Logs, and AI Decision Support.
- **CrisisManager:** Manages Crises, Citizen Requests, Organizations, Resources/Warehouses/Inventory/Allocations, Shelters, and AI Decision Support.
- **Responder:** Views Crises, Areas, Resources, Warehouses, Inventory, Allocations, Shelters, and manages Citizen Requests.
- **Citizen:** Submits and tracks Citizen Assistance Requests, views active Crises/Areas/Shelters, and receives personal Notifications.
- **Volunteer / Donor:** Registers volunteer profiles or donations and receives status notifications.

---

## 8. Known Limitations & External Dependencies
- **AI Decision Support (Google Gemini Free Tier):** Optional; defaults to `UnconfiguredAiAnalysisProvider` (`HTTP 503`) until `AiProvider:Provider=Gemini` and `AiProvider:GeminiApiKey` are configured. Free-tier Gemini endpoints may experience transient `HTTP 503` spikes under high demand (bounded 2-retry exponential backoff is built in).
- **System Settings Page:** Intentionally read-only/unavailable in live mode because runtime secrets and environment configuration are managed outside the database.
