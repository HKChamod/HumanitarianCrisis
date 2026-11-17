## HUMANITARIAN CRISIS MANAGEMENT SYSTEM

## Frontend–Backend API Integration Specification

## Version 1.0 | 15 November 2026

Proposed API contract for React frontend development and .NET 10 backend implementation.

## Purpose

A shared technical contract for all six group members. It maps screens to API endpoints, defines HTTP methods, payloads, response shapes, authorization, validation, errors, mock data and integration steps.

## Important contract status

Routes and payloads in this document are proposed. They are not claims that these endpoints already exist in the repository. Confirm and version the contract before implementing controllers.


## Contents

- 1. Project/backend status

- 2. Integration architecture

- 3. API standards and common contracts

- 4. Authentication and authorization

- 5. Complete endpoint catalogue

- 6. Frontend screen-to-API mapping

- 7. JSON request/response examples

- 8. Validation, errors and status transitions

- 9. React integration structure

- 10. Mock API development

- 11. Security and privacy

- 12. Integration testing

- 13. Development order

- 14. Team responsibilities

- 15. Readiness checklist

- Appendix: decisions to finalize


## 1. Project/backend status

The project uses .NET 10, ASP.NET Core Web API, Clean Architecture, Entity Framework Core 10, SQL Server and a separate React frontend.

| Area | Latest known status |
| --- | --- |
| Architecture | Domain, Application, Infrastructure and API projects configured. |
| Database | SQL Server database HumanitarianCrisisDB; EF Core SQL Server configured. |
| Existing schema foundation | Users, Roles, UserRoles and CrisisEvents. |
| Entity expansion | Organizations, OrganizationMemberships, OrganizationMembershipRoles, Permissions and RolePermissions were being added; build succeeded, but migration application must be verified. |
| API setup | Swagger, controllers infrastructure and database setup discussed; complete business endpoint implementation pending. |
| Authentication | JWT AddAuthentication / UseAuthentication pipeline was not present in the latest inspected Program.cs context. |
| Frontend | React planned; Figma and API contract preparation underway. |

## Accuracy note

This status reflects the latest project context available (November 14), not a live repository/database inspection. Verify migrations, current controllers and actual routes before treating any feature as complete.

## 1.1 Clean Architecture responsibilities

| Project | Responsibility |
| --- | --- |
| API | Controllers, routes, HTTP binding, auth middleware, Swagger and HTTP response codes. |
| Application | Use cases, DTOs, validation, interfaces, business rules and permission checks. |
| Domain | Entities, enums, domain rules and domain exceptions. |
| Infrastructure | EF Core DbContext/configurations/migrations, repositories, file storage and external integrations. |

React SPA → HTTPS REST API → Application use cases/services → Infrastructure / EF Core → SQL Server

Keep controllers thin. Do not put business logic or raw database queries in controllers. API controllers call Application use cases; Infrastructure implements persistence and external-service interfaces.

## 2. Integration architecture

## 2.1 Base URLs

| Environment | Example | Notes |
| --- | --- | --- |
| Local API | https://localhost:7xxx/api/v1 | Replace 7xxx with actual launchSettings / running API port. |
| Local React | http://localhost:5173 | Typical Vite development URL. |
| Staging | https://staging-api.example.org/api/v1 | Placeholder until deployed. |
| Production | https://api.example.org/api/v1 | Placeholder; never hardcode. |

## Base URL rule

Set VITE_API_BASE_URL in environment configuration and use one shared HTTP client. Do not repeat the host URL inside every React component.

## 2.2 Request lifecycle

- 1. A React page calls a feature service (for example assistanceRequestApi.list()).

- 2. The shared HTTP client attaches the access token and selected organization context.

- 3. API authenticates the request and checks permission and organization scope.

- 4. Controller binds the request DTO and calls an Application use case.

- 5. Application validates business rules and calls Infrastructure persistence/services.

- 6. API returns a documented JSON response and HTTP status code.

- 7. React updates loading, success, empty or error state.

## 2.3 HTTP methods

| Method | Use | Example |
| --- | --- | --- |
| GET | Read data; no state change. | GET /crises?status=Active |


HCMS | FRONTEND–BACKEND API INTEGRATION SPECIFICATION

| POST Create resource or execute command. POST /assistance-requests |
| --- |
| PUT Replace/update resource representation. PUT /organizations/{id} |
| PATCH Update selected fields or transition state. PATCH /crises/{id}/status |
| DELETE Delete/soft-delete where policy allows. DELETE /users/{id} |

## 2.4 Headers

```
Accept: application/json
Content-Type: application/json
Authorization: Bearer <access_token>
X-Correlation-ID: <optional-id>
X-Organization-Id: <selected-organization-id> (proposed context header)
```

The organization header is a context selector only, not proof of access. Server must validate membership and permissions. Choose one consistent organization-context convention; route-based organization IDs are an alternative.

For multipart/form-data, let the browser/Axios create the Content-Type boundary. Do not manually set multipart Content-Type.

## 2.5 Naming and versioning

- Prefix all routes with /api/v1.

- Use plural resource names and kebab-case route segments.

- Use camelCase JSON properties.

- Use UTC ISO 8601 timestamps, e.g. 2026-11-15T10:30:00Z.

- Choose one identifier type per entity (GUID or integer) and use it consistently.

- Return DTOs, not EF Core entity instances.

- Use query parameters for search, filters, sorting and pagination.

- Document status transitions; do not allow arbitrary status strings.

## 3. API standards and common contracts

## 3.1 Success envelope

```
{
"data": { "id": "resource-id", "name": "Example" },
"meta": {
"correlationId": "b7e...",
"timestamp": "2026-11-15T10:30:00Z"
}
}
```

## 3.2 Paginated list response

```
{
"data": [{ "id": "1", "name": "Example" }],
"pagination": {
"page": 1, "pageSize": 20,
"totalItems": 125, "totalPages": 7
},
"meta": { "correlationId": "b7e..." }
}
```

## 3.3 Query parameters

| Parameter | Meaning | Default |
| --- | --- | --- |
| page | 1-based page number | 1 |
| pageSize | Records per page | 20; maximum 100 |
| search | Search supported fields | none |
| sortBy | Whitelisted field | module default |
| sortDirection | asc or desc | desc |
| from / to | Date range in ISO 8601 | none |
| status | Filter by documented status | none |
| organizationId | Scope filter only when permitted | active organization/server scope |

GET /api/v1/assistance-requests?page=1&pageSize=20&search=water&status=Pending&sortBy=createdAt&sortDirection=desc


## 3.4 Standard error response

```
{
"type": "https://api.example.org/problems/validation-error",
"title": "Validation failed",
"status": 400,
"detail": "One or more fields are invalid.",
"traceId": "00-abcd...",
"errors": {
"description": ["Description is required."],
"peopleAffected": ["Must be greater than zero."]
}
}
```

## 3.5 HTTP status codes

| Code | Meaning | Frontend behavior |
| --- | --- | --- |
| 200 | Successful read/update/action | Update view/cache. |
| 201 | Created | Use returned ID; show success. |
| 202 | Accepted for background job | Show processing; poll/refresh as documented. |
| 204 | Success, no body | Do not parse JSON. |
| 400 | Invalid request | Show field errors. |
| 401 | Not authenticated/expired | Refresh once if supported; else sign in. |
| 403 | Authenticated but forbidden | Show access denied. |
| 404 | Not found/not visible | Show not-found state. |
| 409 | Conflict/invalid transition | Refresh record and explain conflict. |
| 413 / 415 | Upload too large / unsupported type | Show upload guidance. |
| 422 | Business rule failure if adopted | Show rule message. |
| 429 | Rate limited | Respect Retry-After. |
| 500 / 503 | Server error / unavailable | Safe error + trace ID; no stack trace. |

## 3.6 Shared data concepts

| Concept | Recommended representation |
| --- | --- |
| Id | Consistent GUID or integer per entity. |
| Status | Documented API enum string; do not invent UI-only values. |
| CreatedAt / UpdatedAt | UTC ISO 8601 string. |
| CreatedBy | Safe user summary DTO. |
| Location | Province, district, DS, GN, address and optional coordinates. |
| Attachment | id, fileName, contentType, sizeBytes and secure download route/URL. |
| User summary | id, fullName and only permitted contact/profile fields. |
| Organization summary | id, name, type and relevant membership role/context. |

## 4. Authentication and authorization

The frontend can build against the following contract, but protected API integration requires the backend JWT pipeline to be implemented and tested.

| Method | Route | Purpose | Access |
| --- | --- | --- | --- |
| POST | /auth/register | Create citizen account. | Public |
| POST | /auth/login | Authenticate and issue tokens. | Public |
| POST | /auth/refresh | Refresh access token if refresh-token flow is implemented. | Refresh token |
| POST | /auth/logout | Revoke refresh token/session if supported. | Authenticated |
| GET | /auth/me | Current user, roles, permissions and accessible organizations. | Bearer |
| POST | /auth/forgot-password | Start password recovery. | Public |
| POST | /auth/reset-password | Complete reset using one-time token. | Reset token |
| POST | /auth/change-password | Change current password. | Bearer |

## 4.1 Login example

```
POST /api/v1/auth/login
{
"email": "citizen@example.com",
"password": "user-entered-password"
}
200 OK
```


```
{
"data": {
"accessToken": "<jwt>",
"expiresAt": "2026-11-15T11:00:00Z",
"refreshToken": "<opaque-token-if-enabled>",
"user": {
"id": "user-id",
"fullName": "Example Citizen",
"email": "citizen@example.com"
},
"memberships": [{
"organizationId": "org-id",
"organizationName": "Relief Organization",
"roles": ["OrganizationManager"]
}]
}
}
```

Never return password hashes. Prefer secure HttpOnly, SameSite cookies for long-lived refresh tokens when supported. Avoid storing long- lived refresh tokens in localStorage. Agree the access-token strategy with the backend security design.

## 4.2 RBAC rules

- Authentication identifies the user; authorization decides what the user can do.

- System roles apply globally; organization roles apply only within the selected organization.

- The API enforces permissions on every protected operation. Hiding a React menu item is not security.

- Validate organization membership and permission on every organization-scoped request.

- A user with multiple memberships needs a clear active-organization context.

- Return effective permissions through /auth/me or a dedicated endpoint; do not rely only on hardcoded role names.

## 4.3 Permission examples

```
crises.read / crises.create / crises.update / crises.close
requests.read / requests.verify / requests.assign
organizations.read / organizations.approve / memberships.manage
inventory.read / inventory.adjust / inventory.dispatch
shelters.manage / volunteers.assign / reports.read
```

## 5. Complete endpoint catalogue

All routes in this section are proposed API v1 routes. [P] = public, [A] = authenticated, [Perm] = permission-scoped. List routes should use the common pagination/filter conventions where relevant.

## 5.1 Users and access control

| Method | Route | Purpose / behavior | Access |
| --- | --- | --- | --- |
| GET | /users | List/search users; filters status, role, search. | [Perm] users.read |
| GET | /users/{userId} | User detail with permitted fields. | [Perm] users.read |
| POST | /users | Administrative user creation, if needed. | [Perm] users.create |
| PUT | /users/{userId} | Update permitted profile/admin fields. | [Perm] users.update |
| PATCH | /users/{userId}/status | Activate/deactivate account. | [Perm] users.manage |
| DELETE | /users/{userId} | Soft-delete/deactivate where policy allows. | [Perm] users.delete |
| GET | /roles | List system roles. | [Perm] roles.read |
| POST | /roles | Create system role. | [Perm] roles.manage |
| PUT | /roles/{roleId} | Update role name/description. | [Perm] roles.manage |
| DELETE | /roles/{roleId} | Delete if not assigned/in use. | [Perm] roles.manage |
| GET | /permissions | List permission catalogue. | [Perm] permissions.read |
| POST | /roles/{roleId}/permissions | Assign/replace role permissions; define exact semantics. | [Perm] permissions.manage |
| DELETE | /roles/{roleId}/permissions/{permissionId} Remove permission from role. |   | [Perm] permissions.manage |
| GET | /users/{userId}/roles | List system role assignments. | [Perm] roles.read |
| POST | /users/{userId}/roles | Assign system role. | [Perm] roles.assign |
| DELETE | /users/{userId}/roles/{roleId} | Remove system role. | [Perm] roles.assign |

## 5.2 Sri Lankan geographic areas

Area hierarchy: Province → District → Divisional Secretariat Division → Grama Niladhari Division → locality. Confirm authoritative dataset and IDs before seeding.


## HCMS | FRONTEND–BACKEND API INTEGRATION SPECIFICATION

| Method | Route | Purpose / behavior | Access |
| --- | --- | --- | --- |
| GET | /areas/provinces | List provinces. | [P]/[A] |
| GET | /areas/districts | List districts; filter provinceId. | [P]/[A] |
| GET | /areas/ds-divisions | List DS divisions; filter districtId. | [P]/[A] |
| GET | /areas/gn-divisions | List GN divisions; filter dsDivisionId. | [P]/[A] |
| GET | /areas/{areaId} | Area detail and parent hierarchy. | [P]/[A] |
| GET | /areas/search | Search areas/localities. | [P]/[A] |
| POST | /areas | Create/import area; restricted data admin. | [Perm] areas.manage |
| PUT | /areas/{areaId} | Update area metadata. | [Perm] areas.manage |

## 5.3 Crisis events

CrisisEvent exists in the discussed schema foundation. Area linking, lifecycle transitions and public visibility still need to be finalized.

| Method | Route | Purpose / behavior | Access |
| --- | --- | --- | --- |
| GET | /crises | List; filters status, severity, type, areaId, dates. | [Perm] crises.read |
| GET | /crises/active | Active/publicly visible crisis list. | [P]/[A] |
| GET | /crises/{crisisId} | Details and linked areas. | [P]/[A] |
| POST | /crises | Create crisis event. | [Perm] crises.create |
| PUT | /crises/{crisisId} | Update details. | [Perm] crises.update |
| PATCH | /crises/{crisisId}/status | Allowed status transition. | [Perm] crises.manage |
| POST | /crises/{crisisId}/areas | Link affected areas. | [Perm] crises.manage |
| DELETE | /crises/{crisisId}/areas/{areaId} | Remove affected area link. | [Perm] crises.manage |
| GET | /crises/{crisisId}/organizations | List participating/assigned organizations. | [Perm] crises.read |
| POST | /crises/{crisisId}/organizations | Assign organization to crisis. | [Perm] crises.assign |
| DELETE | /crises/{crisisId}/organizations/{organizationId} Remove assignment if permitted. |   | [Perm] crises.assign |
| GET | /crises/{crisisId}/timeline | Crisis activity/status timeline. | [Perm] crises.read |

## 5.4 Public portal

Only disclose public-approved information. Never expose internal notes, private citizen details or restricted operations.

| Method | Route | Purpose / behavior | Access |
| --- | --- | --- | --- |
| GET | /public/crises | Public crisis list. | [P] |
| GET | /public/crises/{crisisId} | Public crisis details. | [P] |
| GET | /public/shelters | Public shelter listing with approved availability data. | [P] |
| GET | /public/shelters/{shelterId} | Public shelter detail. | [P] |
| GET | /public/notices | Public alerts/notices. | [P] |
| POST | /public/assistance-requests | Guest request; return secure tracking reference. | [P] + rate limit |
| POST | /public/assistance-requests/track | Track using reference plus verification factor. | [P] + rate limit |
| POST | /public/volunteer-applications | Guest volunteer application if enabled. | [P] |

## 5.5 Assistance requests

Define guest ownership/tracking, request categories, workflow states, edit lock rules, verification and privacy before coding.

| Method | Route | Purpose / behavior | Access |
| --- | --- | --- | --- |
| GET | /assistance-requests | Visible requests; filter status, category, urgency, crisis, area, org, dates. | [Perm] requests.read |
| GET | /assistance-requests/my | Current citizen's requests. | [A] |
| GET | /assistance-requests/{requestId} | Request detail within access scope. | [Perm] requests.read |
| POST | /assistance-requests | Create authenticated citizen request. | [A] |
| PUT | /assistance-requests/{requestId} | Edit permitted fields before workflow lock. | [Perm] requests.update |
| PATCH | /assistance-requests/{requestId}/status | Allowed status transition. | [Perm] requests.manage |
| POST | /assistance-requests/{requestId}/verify | Verify/reject with reason. | [Perm] requests.verify |
| POST | /assistance-requests/{requestId}/assignments | Assign organization/team/officer. | [Perm] requests.assign |
| GET | /assistance-requests/{requestId}/assignments | Current and historical assignments. | [Perm] requests.read |
| POST | /assistance-requests/{requestId}/notes | Add internal note. | [Perm] requests.notes |
| GET | /assistance-requests/{requestId}/history | Status/action history. | [Perm] requests.read |
| POST | /assistance-requests/{requestId}/attachments | Upload supporting file(s). | [Perm] requests.attach |
| DELETE | /assistance- requests/{requestId}/attachments/{attachmentId} | Remove attachment if allowed. | [Perm] requests.attach |
| POST | /assistance-requests/{requestId}/complete | Record delivery/completion evidence. | [Perm] requests.complete |
| POST | /assistance-requests/{requestId}/feedback | Citizen feedback. | [A] owner |

## 5.6 Organizations and memberships

Support multiple memberships per user. Organization role assignment is scoped to a membership, not a global user role.

| Method | Route | Purpose / behavior | Access |
| --- | --- | --- | --- |


## HCMS | FRONTEND–BACKEND API INTEGRATION SPECIFICATION

| GET | /organizations | List; filter status/type/area/search. | [Perm] organizations.read |
| --- | --- | --- | --- |
| GET | /organizations/{organizationId} | Organization detail. | [Perm] organizations.read |
| POST | /organizations | Register/create organization. | [A]/[Perm] |
| PUT | /organizations/{organizationId} | Update profile. | [Perm] organizations.update |
| PATCH | /organizations/{organizationId}/status | Approve/reject/suspend according to workflow. | [Perm] organizations.approve |
| GET | /organizations/{organizationId}/members | List members. | [Perm] memberships.read |
| POST | /organizations/{organizationId}/memberships | Apply/request membership. | [A] |
| GET | /organizations/{organizationId}/memberships | List applications and memberships. | [Perm] memberships.read |
| POST | /organizations/{organizationId}/memberships/{membershipId}/approve Approve membership. |   | [Perm] memberships.manage |
| POST | /organizations/{organizationId}/memberships/{membershipId}/reject | Reject with reason. | [Perm] memberships.manage |
| PATCH | /organizations/{organizationId}/memberships/{membershipId}/status | Suspend/restore/remove if policy allows. | [Perm] memberships.manage |
| GET | /organizations/{organizationId}/memberships/{membershipId}/roles | Get organization-scoped roles. | [Perm] memberships.roles.read |
| PUT | /organizations/{organizationId}/memberships/{membershipId}/roles | Set scoped roles. | [Perm] memberships.roles.manage |
| GET | /my/organizations | Organizations current user can access. | [A] |

## 5.7 Resources, warehouses and inventory

Treat resource catalogue, stock balance, stock movement, allocation and dispatch as separate concepts. Prevent negative stock and use concurrency protection.

| Method | Route | Purpose / behavior | Access |
| --- | --- | --- | --- |
| GET | /resource-categories | List resource categories. | [Perm] inventory.read |
| POST | /resource-categories | Create category. | [Perm] inventory.manage |
| GET | /resources | List resource catalogue. | [Perm] inventory.read |
| GET | /resources/{resourceId} | Resource detail. | [Perm] inventory.read |
| POST | /resources | Create catalogue item. | [Perm] inventory.manage |
| PUT | /resources/{resourceId} | Update metadata. | [Perm] inventory.manage |
| GET | /organizations/{organizationId}/warehouses | List org warehouses. | [Perm] warehouses.read |
| POST | /organizations/{organizationId}/warehouses | Create warehouse. | [Perm] warehouses.manage |
| GET | /warehouses/{warehouseId} | Warehouse detail. | [Perm] warehouses.read |
| PUT | /warehouses/{warehouseId} | Update warehouse. | [Perm] warehouses.manage |
| GET | /warehouses/{warehouseId}/inventory | Stock balances; filter resource/category/lowStock. | [Perm] inventory.read |
| POST | /warehouses/{warehouseId}/inventory/receipts Record received stock. |   | [Perm] inventory.adjust |
| POST | /warehouses/{warehouseId}/inventory/issues | Record stock issue/consumption. | [Perm] inventory.adjust |
| POST | /inventory/transfers | Transfer stock between warehouses. | [Perm] inventory.transfer |
| GET | /inventory/movements | Stock movement history. | [Perm] inventory.read |
| GET | /inventory/low-stock | Items below threshold. | [Perm] inventory.read |
| POST | /resource-allocations | Allocate to crisis/request/shelter/org. | [Perm] resources.allocate |
| GET | /resource-allocations | List allocations. | [Perm] resources.read |
| GET | /resource-allocations/{allocationId} | Allocation detail. | [Perm] resources.read |
| PATCH | /resource-allocations/{allocationId}/status | Update allocation state. | [Perm] resources.allocate |
| POST | /resource-dispatches | Create dispatch. | [Perm] resources.dispatch |
| GET | /resource-dispatches | List dispatches. | [Perm] resources.read |
| GET | /resource-dispatches/{dispatchId} | Dispatch details. | [Perm] resources.read |
| PATCH | /resource-dispatches/{dispatchId}/status | Update dispatch/delivery state. | [Perm] resources.dispatch |

## 5.8 Shelters

Protect resident data. Capacity allocation must be transactional to prevent overbooking.

| Method | Route | Purpose / behavior | Access |
| --- | --- | --- | --- |
| GET | /shelters | List; filter status, area, crisis, available capacity. | [Perm] shelters.read |
| GET | /shelters/{shelterId} | Shelter details. | [Perm] shelters.read |
| POST | /shelters | Create shelter. | [Perm] shelters.manage |
| PUT | /shelters/{shelterId} | Update details/capacity. | [Perm] shelters.manage |
| PATCH | /shelters/{shelterId}/status | Open/close/full/inactive transitions. | [Perm] shelters.manage |
| GET | /shelters/{shelterId}/occupancy | Occupancy summary. | [Perm] shelters.read |
| GET | /shelters/{shelterId}/registrations | Resident records (restricted). | [Perm] shelters.residents.read |
| POST | /shelters/{shelterId}/registrations | Register affected person/household. | [Perm] shelters.residents.manage |
| POST | /shelters/{shelterId}/allocations | Allocate person/household. | [Perm] shelters.allocate |
| POST | /shelters/{shelterId}/check-outs | Record departure. | [Perm] shelters.residents.manage |
| GET | /shelters/{shelterId}/history | Occupancy/operations history. | [Perm] shelters.read |

## 5.9 Volunteers and tasks

| Method | Route | Purpose / behavior | Access |
| --- | --- | --- | --- |
| GET | /volunteers | List volunteers visible to caller/org. | [Perm] volunteers.read |
| GET | /volunteers/{volunteerId} | Volunteer details. | [Perm] volunteers.read |
| POST | /volunteers | Create profile for signed-in user. | [A] |
| PUT | /volunteers/{volunteerId} | Update own/permitted fields. | [Perm] volunteers.update |
| PATCH | /volunteers/{volunteerId}/verification | Verify/reject volunteer. | [Perm] volunteers.verify |
| GET | /volunteer-tasks | List tasks; filter crisis, area, skill, status. | [Perm] volunteers.tasks.read |


HCMS | FRONTEND–BACKEND API INTEGRATION SPECIFICATION

| POST /volunteer-tasks Create task. [Perm] volunteers.tasks.manage |
| --- |
| GET /volunteer-tasks/{taskId} Task details. [Perm] volunteers.tasks.read |
| PUT /volunteer-tasks/{taskId} Update task. [Perm] volunteers.tasks.manage |
| POST /volunteer-tasks/{taskId}/assignments Assign volunteers. [Perm] volunteers.assign |
| POST /volunteer-tasks/{taskId}/accept Volunteer accepts offer if used. [A] assigned volunteer |
| PATCH /volunteer-tasks/{taskId}/status Update progress/status. [Perm] volunteers.tasks.update |
| GET /volunteers/{volunteerId}/assignments Volunteer task history. [Perm] volunteers.read |

## 5.10 Donations and campaigns

If financial donations/payment gateway are required, design that integration separately. Do not collect card details in the HCMS API.

| Method | Route | Purpose / behavior | Access |
| --- | --- | --- | --- |
| GET | /donation-campaigns | List campaigns; public/authorized scope. | [P]/[A] |
| GET | /donation-campaigns/{campaignId} | Campaign details. | [P]/[A] |
| POST | /donation-campaigns | Create campaign. | [Perm] donations.campaigns.manage |
| PUT | /donation-campaigns/{campaignId} | Update campaign. | [Perm] donations.campaigns.manage |
| PATCH | /donation- campaigns/{campaignId}/status | Publish/close campaign. | [Perm] donations.campaigns.manage |
| GET | /donations | List donation records. | [Perm] donations.read |
| POST | /donations | Record donation/pledge; not card- payment processing. | [Perm] donations.create |
| GET | /donations/{donationId} | Donation details. | [Perm] donations.read |
| PATCH | /donations/{donationId}/status | Received/verified/distributed state. | [Perm] donations.manage |
| POST | /donations/{donationId}/items | Add donated goods/quantities. | [Perm] donations.manage |
| POST | /donations/{donationId}/distributions | Record distribution. | [Perm] donations.distribute |
| GET | /donations/reports/summary | Donation summary. | [Perm] donations.reports |

## 5.11 AI decision support

Long-running AI jobs may return 202 Accepted with jobId. Record model/version/input provenance. Human officers retain final decision authority.

| Method | Route | Purpose / behavior | Access |
| --- | --- | --- | --- |
| GET | /ai/dashboard | AI analysis/recommendation summary. | [Perm] ai.read |
| POST | /ai/requests/{requestId}/classify | Classify assistance request. | [Perm] ai.analyze |
| POST | /ai/requests/{requestId}/urgency-score | Estimate urgency. | [Perm] ai.analyze |
| POST | /ai/requests/{requestId}/duplicate-check | Check possible duplicate. | [Perm] ai.analyze |
| POST | /ai/resource-recommendations | Recommend resource allocation. | [Perm] ai.recommend |
| POST | /ai/shelter-recommendations | Recommend suitable shelters. | [Perm] ai.recommend |
| POST | /ai/volunteer-matches | Match volunteers to tasks. | [Perm] ai.recommend |
| POST | /ai/crisis-forecasts | Forecast crisis development. | [Perm] ai.forecast |
| POST | /ai/anomaly-detection | Analyze for unusual patterns. | [Perm] ai.analyze |
| POST | /ai/report-summaries | Summarize authorized report data. | [Perm] ai.summarize |
| GET | /ai/recommendations | List recommendations; filter type/status/crisis/request. | [Perm] ai.read |
| GET | /ai/recommendations/{recommendationId} | Recommendation, evidence and model metadata. | [Perm] ai.read |
| POST | /ai/recommendations/{recommendationId}/decision | Human accept/reject/modify decision and rationale. | [Perm] ai.decide |

## 5.12 Reports and analytics

| Method | Route | Purpose / behavior | Access |
| --- | --- | --- | --- |
| GET | /reports/dashboard | KPI summary for caller's permitted scope. | [Perm] reports.read |
| GET | /reports/crises | Crisis statistics; date, area, severity, type filters. | [Perm] reports.read |
| GET | /reports/assistance-requests | Request stats; date, status, category, area, org filters. | [Perm] reports.read |
| GET | /reports/resources | Inventory/utilization statistics. | [Perm] reports.read |
| GET | /reports/shelters | Occupancy/capacity statistics. | [Perm] reports.read |
| GET | /reports/volunteers | Volunteer/task statistics. | [Perm] reports.read |
| GET | /reports/donations | Donation statistics. | [Perm] reports.read |
| POST | /reports/exports | Start PDF/XLSX/CSV export job. | [Perm] reports.export |
| GET | /reports/exports/{jobId} | Export job status and secure download route. | [Perm] reports.export |

## 5.13 Notifications

In-app notifications can be implemented first. Email/SMS/push require separate provider, consent and delivery design.

| Method | Route | Purpose / behavior | Access |
| --- | --- | --- | --- |
| GET | /notifications | Current user's notifications. | [A] |
| GET | /notifications/unread-count | Unread count. | [A] |
| GET | /notifications/{notificationId} | Notification detail. | [A] owner |
| PATCH | /notifications/{notificationId}/read | Mark one read. | [A] owner |
| POST | /notifications/read-all | Mark all current user's notifications read. | [A] |


| POST /admin/notifications/broadcasts Create authorized broadcast. [Perm] notifications.broadcast |
| --- |
| GET /admin/notifications/broadcasts List broadcasts. [Perm] notifications.manage |

## 5.14 Audit logs and settings

Audit records should be append-only from application workflows. Never expose passwords, tokens or unnecessary personal data.

| Method | Route | Purpose / behavior | Access |
| --- | --- | --- | --- |
| GET | /audit-logs | Search by actor, action, entity and date. | [Perm] audit.read |
| GET | /audit-logs/{auditId} | Audit event detail. | [Perm] audit.read |
| GET | /system/settings | Read safe settings. | [Perm] settings.read |
| PUT | /system/settings | Update permitted settings. | [Perm] settings.manage |
| GET | /system/health | Health status; restrict infrastructure detail. | [Admin/ops] |

## 6. Frontend screen-to-API mapping

| Frontend page | Main API calls |
| --- | --- |
| Public Landing | GET /public/crises, /public/notices, optional /public/shelters |
| Active Crises / Details | GET /public/crises, GET /public/crises/{id} |
| Crisis Map | GET /public/crises or /crises with area/coordinate data |
| Guest Assistance | POST /public/assistance-requests; attachment flow if allowed |
| Guest Track Request | POST /public/assistance-requests/track |
| Login / Register | POST /auth/login, POST /auth/register |
| Citizen Dashboard | GET /auth/me, GET /assistance-requests/my, GET /notifications/unread-count |
| Submit Request | POST /assistance-requests; attachment endpoint if needed |
| My Requests / Details | GET /assistance-requests/my, GET /{id}, GET /{id}/history |
| Citizen Profile | GET /auth/me and agreed profile update endpoint |
| Central Admin Dashboard | GET /reports/dashboard, /crises, /assistance-requests, /organizations |
| Crisis List / Detail | GET /crises, GET /crises/{id}, GET /crises/{id}/timeline |
| Create/Edit Crisis | POST /crises, PUT /crises/{id}, crisis-area routes |
| Crisis Map / Areas | GET /crises, GET /areas hierarchy |
| Request Management | GET /assistance-requests with filters; GET detail/history |
| Request Verification | POST /{id}/verify or PATCH /{id}/status |
| Request Assignment | POST /{id}/assignments, GET /{id}/assignments |
| Organization List / Detail | GET /organizations, GET /organizations/{id} |
| Organization Approval | PATCH /organizations/{id}/status |
| Membership Management | GET memberships, POST approve/reject |
| Organization Dashboard | GET /reports/dashboard with org context; assigned crises/requests/inventory |
| Warehouse List / Detail | GET /organizations/{id}/warehouses, GET /warehouses/{id} |
| Inventory | GET /warehouses/{id}/inventory, /inventory/low-stock, /inventory/movements |
| Stock In / Out / Transfer | POST receipts, POST issues, POST /inventory/transfers |
| Resource Allocation / Dispatch | POST /resource-allocations, POST /resource-dispatches, PATCH status |
| Shelter List / Occupancy | GET /shelters, GET /shelters/{id}/occupancy |
| Volunteer Screens | GET /volunteers, /volunteer-tasks and assignment routes |
| Donation Screens | GET/POST /donation-campaigns, /donations and distribution routes |
| AI Dashboard / Review | GET /ai/dashboard, GET recommendation, POST human decision |
| Reports | GET /reports/{type}, POST /reports/exports |
| Notifications | GET /notifications, PATCH read, POST read-all |
| Users / Roles / Permissions | User, role and permission endpoints |
| Audit Logs | GET /audit-logs and GET detail |

## 7. JSON request/response examples

## 7.1 Create assistance request

```
POST /api/v1/assistance-requests
Authorization: Bearer <access_token>
{
"crisisId": "crisis-guid",
"category": "Food",
"description": "Family needs emergency food assistance.",
"peopleAffected": 5,
"location": {
"provinceId": "province-id",
"districtId": "district-id",
"dsDivisionId": "ds-id",
```


```
"gnDivisionId": "gn-id",
"addressLine": "Example village",
"latitude": 7.4675,
"longitude": 80.6234
},
"contactPhone": "+94XXXXXXXXX"
}
201 Created
{
"data": {
"id": "request-guid",
"referenceNumber": "HCMS-2026-000123",
"status": "Submitted",
"category": "Food",
"createdAt": "2026-11-15T10:30:00Z"
}
}
```

Confirm exact categories, whether crisisId is required, location fields and guest tracking policy before implementation.

## 7.2 Verify request

```
POST /api/v1/assistance-requests/{requestId}/verify
{
"decision": "Verified",
"reviewNote": "Identity and location details checked."
}
200 OK
{
"data": {
"id": "request-guid",
"status": "Verified",
"reviewedAt": "2026-11-15T11:15:00Z",
"reviewedBy": { "id": "officer-id", "fullName": "Review Officer" }
}
}
```

## 7.3 Create crisis

```
POST /api/v1/crises
{
"crisisName": "Flooding in Example District",
"crisisType": "Flood",
"description": "Heavy rainfall caused localized flooding.",
"severityLevel": "High",
"startDate": "2026-11-15T06:00:00Z",
"status": "Active",
"areaIds": ["area-id-1", "area-id-2"]
}
201 Created
{
"data": {
"crisisId": "crisis-guid",
"crisisName": "Flooding in Example District",
"status": "Active",
"severityLevel": "High",
"affectedAreaCount": 2
}
}
```

## 7.4 AI job and human decision

```
POST /api/v1/ai/resource-recommendations
{
"crisisId": "crisis-guid",
"areaIds": ["area-id"],
"needs": ["DrinkingWater", "Food"]
}
202 Accepted
{ "data": { "jobId": "job-guid", "status": "Processing" } }
```


```
POST /api/v1/ai/recommendations/{recommendationId}/decision
{
"decision": "Modified",
"decisionNote": "Approve smaller initial allocation pending stock check.",
"approvedQuantity": 750
}
```

Finalize AI schema after choosing model/service and synchronous/asynchronous processing. Never show fabricated accuracy/confidence values.

## 7.5 Stock receipt

```
POST /api/v1/warehouses/{warehouseId}/inventory/receipts
{
"resourceId": "resource-guid",
"quantity": 2500,
"unit": "Bottle",
"reference": "DONATION-REF-001",
"notes": "Drinking water received."
}
201 Created
{
"data": {
"movementId": "movement-guid",
"warehouseId": "warehouse-guid",
"resourceId": "resource-guid",
"quantity": 2500,
"balanceAfter": 2500,
"movementType": "Receipt"
}
}
```

## 8. Validation, errors and status transitions

| HTTP result | Frontend behavior |
| --- | --- |
| 200/201 | Update data/cache and show success. |
| 400/422 | Map errors.errors[field] to fields; show summary. |
| 401 | Try supported refresh once; otherwise clear session and sign in. |
| 403 | Show access denied; don't retry. |
| 404 | Show not found; refresh list if needed. |
| 409 | Explain conflict and refresh current record. |
| 413/415 | Show file size/type guidance. |
| 429 | Respect Retry-After; prevent rapid resubmission. |
| 500/503 | Safe generic message and trace ID; no stack trace. |

## 8.1 Validation rules

- Frontend validation is for usability; backend validation is authoritative.

- Use required, length, range, date and file checks based on agreed DTO rules.

- Preserve user input when validation fails.

- Display field-level errors and a form-level summary.

- Disable duplicate submission while a request is processing.

- Use idempotency keys for high-impact create/dispatch/payment operations where retry duplication is possible.

## 8.2 Example workflow states (must be finalized)

| Workflow | Example lifecycle |
| --- | --- |
| Assistance request | Submitted → UnderReview → Verified → Approved → Assigned → InProgress → Completed; alternatives: Rejected, OnHold, Cancelled. |
| Crisis | Draft → Active → Monitoring → Resolved → Closed. |
| Organization | Pending → Approved/Rejected → Active/Suspended. |
| Dispatch | Prepared → Dispatched → InTransit → Delivered / Failed / Cancelled. |
| Volunteer task | Available → Assigned → Accepted → InProgress → Completed / Cancelled. |
| Donation | Pledged → Received → Verified → Distributed / Closed. |

These are examples, not final enum commitments. Backend must define allowed transitions. UI should offer only actions valid for the current state and caller permission.

Humanitarian Crisis Management System • API Specification v1.0 • 15 November 2026


## 9. React integration architecture

## 9.1 Suggested folder structure

```
src/
app/ # router, providers, guards
api/ # httpClient, endpoints, shared errors, DTO types
features/
auth/
crises/
assistance-requests/
organizations/
inventory/
shelters/
volunteers/
donations/
ai/
reports/
notifications/
components/
layout/
common/
forms/
tables/
hooks/
utils/
mocks/
assets/
```

## 9.2 Shared Axios client example

```
// src/api/httpClient.ts
import axios from "axios";
export const httpClient = axios.create({
baseURL: import.meta.env.VITE_API_BASE_URL,
headers: { Accept: "application/json" },
timeout: 20000,
});
httpClient.interceptors.request.use((config) => {
const token = authTokenStore.getAccessToken(); // implement agreed token strategy
if (token) config.headers.Authorization = `Bearer ${token}`;
const orgId = organizationContext.getActiveOrganizationId();
if (orgId) config.headers["X-Organization-Id"] = orgId;
return config;
});
```

This is an architectural example, not a complete auth implementation. Do not put secrets in source code. Token storage and organization context must follow the agreed security design.

## 9.3 Feature service example

```
// src/features/crises/crisisApi.ts
import { httpClient } from "../../api/httpClient";
export const crisisApi = {
list: (params) => httpClient.get("/crises", { params }),
getById: (id) => httpClient.get(`/crises/${id}`),
create: (payload) => httpClient.post("/crises", payload),
update: (id, payload) => httpClient.put(`/crises/${id}`, payload),
updateStatus: (id, payload) =>
httpClient.patch(`/crises/${id}/status`, payload),
};
```

## 9.4 Component rules

- Pages call feature hooks/services, not scattered raw fetch/Axios calls.

- Keep API DTO types separate from form state types when shapes differ.

- Use TanStack Query or a consistent equivalent for loading, cache, invalidation and retries.


- Invalidate/refetch relevant queries after create/update/approve/assign.

- Normalize errors in one shared place.

- Route guards are UX; backend permission checks are security.

- Use .env for base URL; commit only a safe .env.example.

VITE_API_BASE_URL=https://localhost:7xxx/api/v1 VITE_USE_MOCK_API=true

## 10. Mock API development

Frontend work should not wait for backend implementation. Build mock services that implement exactly the same method signatures and data shapes as the real API services.

- 8. Create TypeScript interfaces for request/response DTOs.

- 9. Create one feature service per module (crisisApi, assistanceRequestApi, etc.).

- 10. Create mock implementations with the same exported methods and return types.

- 11. Switch mock/real implementation with VITE_USE_MOCK_API or build-time configuration.

- 12. Use realistic fictional sample data with IDs, statuses, dates and relationships.

- 13. Simulate delay, empty lists, validation errors, 401, 403, 404, 409 and 500.

- 14. When backend APIs are ready, switch adapters without rewriting page components.

## 10.1 Mock scenarios to implement

| Scenario | Expected mock behavior |
| --- | --- |
| Normal list | Paginated results with filters/sorting. |
| Empty list | No data and useful empty state. |
| Loading | Artificial delay and skeleton/spinner. |
| Validation error | 400 with field-level messages. |
| Unauthorized / Forbidden | 401 and 403 flows. |
| Not found / Conflict | 404 and 409 flows. |
| Server error | 500 with trace ID. |
| Large dataset | Pagination and filtering across pages. |
| Organization switch | Different visible records after changing org context. |
| File upload | Success, too large, unsupported type, network failure. |

## Mock data privacy

Use fictional test people, phone numbers, organizations and locations. Never put real citizen personal information in Figma, Git repositories or mock fixtures.

## 11. Security and privacy

- Use HTTPS outside local development.

- Hash passwords using a modern password hashing implementation; never return password hashes or plaintext passwords.

- Validate JWT signature, issuer, audience and expiry. Define refresh-token rotation/revocation if refresh tokens are used.

- Enforce authorization server-side for every sensitive operation.

- Treat organization IDs from React as untrusted; validate membership and permission.

- Rate-limit guest tracking, login, password reset and public submissions.

- Guest request tracking must require more than a guessable reference number; use a second verification factor or secure one-time method.

- Validate uploaded file extension, MIME type, size and content; use controlled storage.

- Minimize personal data returned to each role; protect citizen location/contact and household information.

- Audit approvals, rejections, assignments, role changes, stock adjustments, dispatches and AI-assisted decisions.

- Never log passwords, tokens or sensitive document contents.

- Use server-side filtering/pagination; do not download all private records to the browser.

- Use transactional/concurrency protection for stock balances and shelter capacity.

- AI is advisory; consequential decisions require the defined human review process.


## 12. Integration and testing

## 12.1 Before connecting a screen

- 15. Confirm endpoint exists in Swagger/OpenAPI.

- 16. Confirm request and response DTOs match this contract.

- 17. Confirm auth and permission requirements.

- 18. Confirm pagination, filters and sorting.

- 19. Confirm validation and error response format.

- 20. Test endpoint in Swagger/Postman with fictional test data.

- 21. Connect the React feature service.

- 22. Implement loading, success, empty and error states.

- 23. Test authorized and unauthorized users.

- 24. Verify organization scope and data privacy.

## 12.2 Integration test matrix

| Test | Expected result |
| --- | --- |
| No token on protected endpoint | 401 |
| Valid token but missing permission | 403 |
| Valid token with permission | Successful response |
| User accesses another org's record | 403 or 404 per disclosure policy |
| Invalid body | 400/422 with field errors |
| Unknown ID | 404 |
| Invalid status transition | 409/documented business error |
| Two stock issues exceed available stock | One rejected; balance never negative |
| Shelter allocation exceeds capacity | Rejected; occupancy stays valid |
| Repeated request after timeout | No duplicate high-impact action where idempotency is required |
| Guest tracking without verification | No private request data disclosed |
| AI recommendation reviewed | Human decision and audit event recorded |

Maintain Swagger/OpenAPI with summaries, auth requirements, DTO schemas, status codes and examples. It should be the shared technical reference, not just verbal instructions.

## 13. Recommended implementation order

| Phase | Backend API work | Frontend work in parallel |
| --- | --- | --- |
| 0 Contract | Agree routes, DTOs, enums, error schema, auth and permissions. | React/Vite setup, design system, router, layouts, TypeScript types and mocks. |
| 1 Auth | Register/login, JWT, /auth/me, refresh/logout and password recovery. | Login/register, route guards, mock session and profile shell. |
| 2 Core data | Users/RBAC, areas, crisis CRUD and lifecycle. | Admin dashboard, crisis list/detail/create, location selectors. |
| 3 Assistance | Citizen/guest requests, tracking, verification, history, assignment. | Citizen portal, forms, tracking, review and assignment screens. |
| 4 Organizations | Org CRUD/approval, memberships and scoped roles. | Org portal, switcher, member lists and approvals. |
| 5 Operations | Warehouses, stock, allocations, dispatches, shelters. | Inventory and shelter screens using mock APIs. |
| 6 Supporting | Volunteers, tasks, donations and notifications. | Volunteer, donation and notification screens. |
| 7 Intelligence | AI jobs/recommendations/human decisions, reports, exports, audit. | AI review UI, analytics, report filters/export. |
| 8 Hardening | Security, authorization audit, integration tests, performance and deployment. | E2E tests, accessibility, responsive review and bug fixes. |

## Build a vertical slice first

Do not implement all routes at once. Prove the core flow: login → create crisis → submit request → verify → assign organization → update request → complete. Then expand module by module.

## 14. Group member responsibilities

| Member | Frontend ownership | API areas to understand |
| --- | --- | --- |
| Hasiru | Public & Citizen Portal | Auth, public crises/notices, guest/citizen requests, tracking, profile and notifications. |
| Sineth | Central Administration | Dashboard/report summaries, crisis CRUD, request verification/assignment, users, roles and |


## HCMS | FRONTEND–BACKEND API INTEGRATION SPECIFICATION

|   |   | permissions. |
| --- | --- | --- |
| Natheesha | Organization Portal | Organizations, approvals, memberships, organization roles, assigned crises and requests. |
| Shenali | Resources & Shelters | Resource catalogue, warehouses, stock receipt/issue/transfer, allocations, dispatch and shelter capacity. |
| Nethmi | Volunteers, Donations & Reports | Volunteer profiles/tasks/assignments, campaigns/donations, reports and exports. |
| Hiran | Architecture, AI and integration coordination | Master DTO contract, AI/human decisions, HTTP client, route/permission conventions, Swagger review and integration acceptance. |

All members should use shared TypeScript DTOs and mock services. They should report missing fields, statuses, actions and response details discovered while implementing their assigned screens.

## 15. Final API readiness checklist

- API base URL and version agreed.

- Routes and HTTP methods agreed.

- Request/response DTOs documented.

- Enums and allowed status transitions agreed.

- JWT authentication and refresh/logout strategy implemented and tested.

- Permission names and organization-scoping rules agreed.

- Pagination, sorting and filtering consistent.

- Error response schema and status codes consistent.

- File upload/download contract documented.

- Guest request tracking secure and rate-limited.

- Swagger/OpenAPI matches implemented API.

- Mock services use the same DTOs and behaviors.

- Frontend loading, empty, success and error states implemented.

- Core end-to-end workflow passes integration tests.

- Audit logging and privacy controls tested.

- No secrets or real personal data exposed in frontend code/logs.

## Appendix A — Decisions to finalize before coding

| Decision | Why it matters |
| --- | --- |
| Identifier type per entity | Prevents TypeScript/DTO mismatches. |
| JWT storage and refresh strategy | Affects login, logout and session expiry. |
| Role/permission catalogue | Defines navigation and protected actions. |
| Organization context convention | Header vs route; use one consistently. |
| Guest request verification | Protects private request information. |
| Request categories and lifecycle | Drives forms, badges, filters and transitions. |
| Crisis severity/status enums | Drives dashboards, maps and filters. |
| Sri Lankan area dataset/IDs | Required for location dropdowns and mapping. |
| Inventory units and concurrency | Prevents negative stock and race conditions. |
| Shelter capacity and person/household model | Prevents overbooking. |
| Donation scope/payment handling | Separates donation records from payment processing. |
| AI provider, async job and decision schema | Defines AI DTOs and review screens. |
| File storage/types/limits | Defines upload UI and security. |
| Notification channels | In-app vs email/SMS/push. |
| Report export lifecycle | Defines download and background job UX. |

## Appendix B — Contract ownership

Hiran should maintain the master route list, DTO definitions, permission catalogue and status enums. Module owners can propose changes, but contract changes should be centrally reviewed and recorded in this document and the OpenAPI specification. This prevents six developers from implementing incompatible assumptions.

## END OF API INTEGRATION SPECIFICATION
