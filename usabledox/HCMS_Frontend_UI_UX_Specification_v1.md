**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

# **HUMANITARIAN CRISIS MANAGEMENT SYSTEM** 

Frontend UI/UX Design Specification 

**Version 1.0  |  13 November 2026** 

Prepared as the Figma design brief and frontend planning reference for the HCMS project. 

##### **Document purpose** 

This document defines the proposed frontend portals, dashboards, page inventory, user workflows, navigation, design system, team allocation, and implementation priorities. It is intended to help all six group members create a consistent Figma design and help the development team align React screens with the .NET backend. 

HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

## **Contents** 

- 1. Project overview and current status 

- 2. Overall system structure 

- 3. Complete page and dashboard inventory 

- 4. Main user workflows 

- 5. Navigation and application layout 

- 6. UI/UX design system 

- 7. Figma team allocation 

- 8. Figma file structure 

- 9. Design deliverables and quality checklist 

- 10. Development priorities 

- 11. Backend–frontend alignment 

- 12. Sri Lankan geography and localization 

- 13. Recommended first Figma milestone 

- 14. Implementation principles and assumptions 

HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

## **1. Project overview and current status** 

The Humanitarian Crisis Management System (HCMS) is planned as a centralized platform for coordinating crisis events, affected communities, assistance requests, partner organizations, resources, shelters, volunteers, donations, reporting, and AI-assisted decision support. 

### **1.1 Confirmed project architecture** 

|**Area**|**Current direction / known status**|
|---|---|
|Backend framework|.NET 10 / ASP.NET Core Web API|
|Architecture|Clean Architecture with Domain, Application, Infrastructure, and API<br>projects|
|Data access|Entity Framework Core 10|
|Database|Microsoft SQL Server; database name previously set as<br>HumanitarianCrisisDB|
|API documentation|Swagger / Swashbuckle|
|Frontend|React planned; Figma design is now starting|
|Repository|https://github.com/HKChamod/HumanitarianCrisis|



### **1.2 Backend progress known from the latest project discussions** 

- The solution was upgraded from the earlier .NET version to .NET 10. 

- The main Clean Architecture projects were configured for net10.0. 

- ApplicationDbContext and EF Core SQL Server connectivity were checked against HumanitarianCrisisDB. 

- The initial database foundation included Users, Roles, UserRoles, and CrisisEvents, together with EF migration history. 

- The database model was being expanded with Organizations, OrganizationMemberships, OrganizationMembershipRoles, Permissions, and RolePermissions. 

- Entity configurations were added for several of these entities, and a full solution build had succeeded. 

- The latest known EF Core model state indicated changes requiring a new migration. The migration generation/application status was not confirmed in the latest available project context. 

- A PowerShell path variable issue was encountered in a later conversation. Re-check the current working directory and $base variable before running restore/build commands. 

##### **Status accuracy note** 

This is a snapshot of the latest progress previously discussed, not a live inspection of the Git repository or database. Confirm the current branch, migration files, database migration history, and working tree before treating any item as completed. 

### **1.3 Existing architectural decisions to preserve** 

- Central authority coordinates the overall response, while partner organizations (for example NGOs, hospitals, and government departments) handle assigned operations. 

- A user may belong to multiple organizations. 

- Organization roles and permissions are scoped to the relevant organization. 

- Citizens should be able to submit assistance requests either through a registered account or as a guest, subject to the final backend workflow. 

- Resource inventory is managed through organization warehouses. 

- AI features provide recommendations and decision support; authorized humans retain responsibility for final decisions. 

## **2. Overall system structure** 

The recommended product structure is one React application with shared components and role-/permission-based access to four main portal experiences. 

HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

|**Portal**|**Primary users**|**Purpose**|
|---|---|---|
|Public Portal|General public, guests, prospective<br>volunteers and donors|Public information, active crises, emergency<br>assistance, request tracking, shelters,<br>registration and login.|
|Citizen Portal|Registered citizens / request submitters|Submit and track assistance requests, view<br>updates, manage profile and notifications.|
|Organization Portal|NGOs, hospitals, government departments<br>and relief partners|Manage members, assigned crises and<br>requests, warehouses, inventory, shelters,<br>volunteers and operational reports.|
|Central Administration Portal|Central authority and authorized system<br>administrators|National-level monitoring, crisis<br>coordination, approvals, assignments,<br>access control, reporting and system<br>oversight.|



##### **Application approach** 

Use a single React codebase with shared design tokens, layouts, reusable components, authentication, and protected routes. After login, show the correct dashboard and navigation based on the user's role, permissions, and selected organization. Do not assume every user has access to every module. 

## **3. Complete page and dashboard inventory** 

The page IDs below are reference IDs for Figma frames, discussions, and development tickets. They are a proposed fullsystem inventory; some modules still need matching backend entities, APIs, and workflow decisions. 

### **3.1 Public Portal** 

|**ID**|**Page**|**Main content / purpose**|
|---|---|---|
|PUB-01|Landing Page|System introduction, active emergencies,<br>quick actions and public information.|
|PUB-02|About Us|Purpose, mission, services and participating<br>stakeholders.|
|PUB-03|Active Crises|Current crisis events and affected locations.|
|PUB-04|Crisis Details|Crisis description, severity, affected areas<br>and public updates.|
|PUB-05|Crisis Map|Interactive map showing active crises and<br>relevant locations.|
|PUB-06|Emergency Assistance|Guest-facing assistance request submission.|
|PUB-07|Track Request|Track a request using a reference number<br>and suitable verification.|
|PUB-08|Shelter Finder|Find available shelters and relevant<br>capacity/location information.|
|PUB-09|Volunteer Registration|Apply to become a volunteer.|
|PUB-10|Donation Information|Donation campaigns, accepted items and<br>guidance.|
|PUB-11|Contact / Emergency Info|Contact information and emergency<br>instructions.|
|PUB-12|Login|User authentication.|
|PUB-13|Register|New citizen account registration.|
|PUB-14|Forgot Password|Password recovery.|



##### **Public portal priority** 

PUB-06 and PUB-07 are especially important. The guest request flow should produce a unique tracking/reference number and clearly explain how the submitter can check progress. The final verification method must be defined with the backend/security design. 

### **3.2 Citizen Portal** 

**<mark>Main content / purpose</mark>** 

**<mark>ID</mark>** 

**<mark>Page</mark>** 

HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

|CIT-01|Citizen Dashboard|Personal request overview, status counts,<br>latest updates and quick actions.|
|---|---|---|
|CIT-02|Submit Assistance Request|Submit food, water, medical, shelter or other<br>assistance requests.|
|CIT-03|My Requests|List of the citizen's submitted requests.|
|CIT-04|Request Details|Full request information, current status and<br>assigned updates where visible.|
|CIT-05|Request History|Timeline of request progress and status<br>changes.|
|CIT-06|Edit Profile|Personal information management.|
|CIT-07|My Notifications|Request updates and alerts.|
|CIT-08|My Locations|Saved addresses / affected locations, if<br>supported.|
|CIT-09|Feedback|Feedback about assistance received.|



#### **Citizen dashboard widgets** 

- Total requests submitted 

- Pending requests 

- Approved requests 

- Completed requests 

- Latest request updates 

- Recent notifications 

- Quick action: Submit New Request 

#### **Assistance request form fields to consider** 

- Request category / type 

- Description of need 

- Number of affected people or household size 

- Location and affected area 

- Contact information 

- Urgency-related information gathered through clear questions 

- Supporting images or documents, where appropriate 

- Consent and confirmation information 

#### **Suggested request lifecycle** 

|**Stage / outcome**|**Meaning**|
|---|---|
|Submitted|The system has received the request.<br>f|
|Under Review|Authorized staffare reviewing the information.|
|Verified|The request information has been verified.|
|Approved|Assistance has been approved.|
|In Progress|The organization is preparing or delivering assistance.|
|Completed|Assistance delivery has been recorded as completed.|
|Alternative outcomes|Rejected, Cancelled, or On Hold, where applicable.|



The exact statuses, transitions, and which roles may perform them must be agreed with the backend team. Do not design every status as a mandatory sequential step. 

### **3.3 Central Administration Portal** 

This is the main control center for authorized central-level officers. It should provide an overview of the national response and tools to coordinate crises and partner organizations. 

#### **ADM-01 Central Admin Dashboard** 

|**Widget**|**Information**|
|---|---|
|Active Crises|Number of currently active crisis events.|
|Affected People|Estimated affected population, with source/time context.|



HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

|Pending Requests|Requests awaiting review.|
|---|---|
|Critical Requests|High-urgency requests needing attention.|
|Active Organizations|Participating organizations.|
|Available Resources|Aggregated available resources, where data can be reconciled.|
|Active Shelters|Shelter occupancy and capacity overview.|
|Volunteer Count|Active registered volunteers.|
|Crisis Map|National-level crisis visualization.|
|Recent Activities|Latest system-wide actions.|



|**ID**|**Page**|**Main functionality**|
|---|---|---|
|ADM-01|Central Dashboard|National-level overview.|
|ADM-02|Crisis Management|Manage all crisis events.|
|ADM-03|Create Crisis|Create a crisis event.|
|ADM-04|Crisis Details|View and manage crisis information.|
|ADM-05|Crisis Areas|Manage affected geographical areas.|
|ADM-06|Live Crisis Map|Map-based crisis monitoring.|
|ADM-07|Assistance Requests|View requests across the system.|
|ADM-08|Request Verification|Verify, approve, reject or otherwise process<br>requests according to policy.|
|ADM-09|Request Assignment|Assign requests to suitable organizations.|
|ADM-10|Organization Management|Manage partner organizations.|
|ADM-11|Organization Approvals|Approve or reject organization registrations.|
|ADM-12|User Management|Manage registered system users.|
|ADM-13|Role Management|Manage system-level roles.|
|ADM-14|Permission Management|Manage system permissions.|
|ADM-15|Organization Memberships|Manage organization membership requests<br>and records.|
|ADM-16|Resource Overview|Monitor resources across organizations.|
|ADM-17|Resource Allocation|Coordinate resource allocation.|
|ADM-18|Shelter Overview|Monitor shelters and occupancy.|
|ADM-19|Volunteer Management|Monitor volunteers.|
|ADM-20|Donation Management|Monitor donations and campaigns.|
|ADM-21|AI Decision Support|Review AI-generated recommendations.|
|ADM-22|Reports & Analytics|Generate system-wide reports.|
|ADM-23|Notifications Management|Publish alerts and notifications.|
|ADM-24|Audit Logs|Review important system activities.|
|ADM-25|System Settings|Configure global settings.|



### **3.4 Organization Portal** 

This portal serves partner organizations such as NGOs, hospitals, government departments and relief organizations. Users who belong to multiple organizations should be able to switch between them, while all data and permissions remain scoped correctly. 

|**ID**|**Page**|**Main functionality**|
|---|---|---|
|ORG-01|Organization Dashboard<br>i|Organization-level overview.|
|ORG-02|Organization Profile|Organization information.|
|ORG-03|Organization Members|View members.|
|ORG-04|Membership Requests|Approve or reject membership applications, if<br>authorized.|
|ORG-05|Organization Roles|Assign organization-scoped roles.|
|ORG-06|Organization Permissions|Manage scoped permissions, if allowed.|
|ORG-07|Assigned Crises|View crises assigned to the organization.|
|ORG-08|Assigned Requests|View assistance requests assigned to the<br>organization.|
|ORG-09|Request Processing|Process and update assigned requests.|
|ORG-10|Resource Management|Manage available resources.|
|ORG-11|Warehouse Management|Manage organization warehouses.|
|ORG-12|Inventory Management|Monitor stock quantities.|
|ORG-13|Stock In / Stock Out|Record stock movements.|



HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

|ORG-14|Resource Allocation|Allocate resources to requests or<br>destinations.|
|---|---|---|
|ORG-15|Resource Dispatch|Record and track dispatches.|
|ORG-16|Shelter Management|Manage shelters operated by the<br>organization.|
|ORG-17|Shelter Occupancy|Monitor shelter capacity and occupancy.|
|ORG-18|Volunteer Management|Manage organization volunteers.|
|ORG-19|Volunteer Assignments|Assign tasks to volunteers.|
|ORG-20|Donation Management|Manage received donations.|
|ORG-21|Organization Reports|Generate organization-level reports.|
|ORG-22|Organization Notifications|Organization-specific notifications.|



#### **Organization dashboard widgets** 

- Assigned active crises 

- Assigned assistance requests 

- Pending requests 

- Available resources 

- Low-stock alerts 

- Warehouse / inventory overview 

- Active volunteers 

- Active shelters 

- Recent activities 

#### **Warehouse and inventory screens** 

- Warehouse list 

- Create / Edit warehouse 

- Warehouse details 

- Resource category management 

- Inventory list 

- Add new stock 

- Stock issue / removal 

- Stock transfer 

- Resource allocation 

- Dispatch tracking 

- Low-stock alerts 

- Stock movement history 

##### **Inventory example** 

Organization: Example Relief Organization | Warehouse: Matale Main Warehouse | Resource: Drinking Water | Available: 2,500 bottles | Allocated: 500 bottles | Remaining: 2,000 bottles. Treat this as illustrative sample data only. 

### **3.5 Volunteer Management** 

|**ID**|**Page**|**Main functionality**|
|---|---|---|
|VOL-01|Volunteer Dashboard|Personal volunteer overview.|
|VOL-02|Volunteer Registration<br>i|Register as a volunteer.|
|VOL-03|Volunteer Profile|Skills, experience and availability.|
|VOL-04|Available Tasks|View available humanitarian tasks.|
|VOL-05|Task Details|Task information and location.|
|VOL-06|My Assignments|Accepted and assigned tasks.|
|VOL-07|Task Progress|Update task progress.|
|VOL-08|Volunteer History|Completed tasks and contributions.|
|VOL-09|Volunteer Notifications|New assignments and updates.|



HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

Organization managers need separate screens to review volunteers, verify eligibility where required, assign tasks, and monitor progress. 

### **3.6 Shelter Management** 

|**ID**|**Page**|**Main functionality**|
|---|---|---|
|SH-01|Shelter Dashboard|Shelter statistics.|
|SH-02|Shelter List|List of shelters.|
|SH-03|Create Shelter|Register a new shelter.|
|SH-04|Shelter Details|Location, facilities and capacity.|
|SH-05|Shelter Occupancy|Current residents and available spaces.|
|SH-06|Shelter Registration|Register affected people, subject to privacy<br>rules.|
|SH-07|Shelter Allocation|Allocate people to shelters.|
|SH-08|Shelter Map|View shelters on a map.|
|SH-09|Shelter Reports|Occupancy and usage reports.|



A shelter card can show its name, location, operating status, total capacity, occupied spaces, available spaces, and occupancy percentage. Use clear visual warnings for near-capacity or full shelters. 

### **3.7 AI Decision Support** 

The AI module should be presented as an operational decision-support tool, not as an autonomous authority. Its interface must make the input data, recommendation, limitations, confidence (if genuinely available), and human review outcome understandable. 

|**ID**|**Page**|**Main functionality**|
|---|---|---|
|AI-01|AI Dashboard<br>i|Overview of AI analyses and pending<br>recommendations.|
|AI-02|Request Classification|Classify incoming requests.|
|AI-03|Urgency Prediction|Estimate request urgency.|
|AI-04|Duplicate Detection|Identify potentially duplicate requests.|
|AI-05|Resource Recommendations|Recommend resource allocations.|
|AI-06|Shelter Recommendations|Recommend suitable shelters.|
|AI-07|Volunteer Matching|Match volunteers with tasks.|
|AI-08|Crisis Forecasting|Forecast possible crisis developments.|
|AI-09|Anomaly Detection|Identify unusual patterns.|
|AI-10|AI Report Summaries|Generate summaries from crisis data.|
|AI-11|Recommendation Details|Show recommendation, inputs and<br>supporting reasons.|
|AI-12|Human Decision Review|Accept, reject or modify recommendations<br>and record the decision.|



#### **AI dashboard content** 

- Requests analyzed 

- Critical requests identified 

- Recommendations pending human review 

- Model confidence or performance metrics only when measured and available 

- Recent recommendations and their review status 

#### **Recommendation detail should show** 

- Relevant input data and source context 

- Predicted result / recommendation 

- Confidence score, only if supported by the model 

- Explanation or factors influencing the recommendation 

- Suggested action 

- Accept, reject or modify controls 

HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

#####  Reviewer identity, timestamp and decision history 

##### **AI governance requirement** 

AI output is advisory. A suitably authorized officer must make or approve consequential decisions. Record the human decision and preserve an audit trail. Do not display fabricated accuracy or confidence figures as if they were real model results. 

### **3.8 Donation Management** 

|**ID**|**Page**|**Main functionality**|
|---|---|---|
|DON-01|Donation Dashboard|Donation overview.|
|DON-02|Donation Campaigns|View active campaigns.|
|DON-03|Create Campaign|Create a donation campaign.|
|DON-04|Campaign Details|Campaign information.|
|DON-05|Donation Records|Record received donations.|
|DON-06|Donation Items|Track donated goods and quantities.|
|DON-07|Donation Distribution|Track distribution.|
|DON-08|Donation Reports|Donation statistics.|



The design should distinguish financial donations from physical-goods donations. Financial donation processing, payment integration, receipts and compliance requirements need separate technical decisions. 

### **3.9 Reports and Analytics** 

|**ID**|**Page**|**Main functionality**|
|---|---|---|
|REP-01|Reports Dashboard|Overall performance and reporting overview.|
|REP-02|Crisis Reports|Crisis statistics.|
|REP-03|Assistance Reports|Request volumes, categories and outcomes.|
|REP-04|Resource Reports|Resource availability and utilization.|
|REP-05|Shelter Reports|Shelter occupancy and usage.|
|REP-06|Volunteer Reports|Volunteer activity and task performance.|
|REP-07|Donation Reports|Donation statistics.|
|REP-08|Generate Report|Custom report generation.|



Consider date, location, crisis, and organization filters, plus PDF/Excel export where supported. Data shown must respect the user's access scope. 

### **3.10 Shared system pages** 

|**ID**|**Page**|**Main functionality**|
|---|---|---|
|COM-01|Notifications|Notification center.|
|COM-02|Notification Details|Full notification.|
|COM-03|Global Search|Search permitted system records.|
|COM-04|User Profile|User account information.|
|COM-05|Account Settings|Account configuration.|
|COM-06|Change Password|Password management.|
|COM-07|Access Denied|Permission error page.|
|COM-08|404 Not Found|Page not found.|
|COM-09|500 Error|Server error.|
|COM-10|Loading / Empty States|Loading, no-data and relevant error states.|



## **4. Main user workflows** 

### **4.1 Crisis management workflow** 

1. Central Admin creates a crisis event. 

HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

2. Defines affected geographical areas. 

3. Monitors incoming citizen requests. 

4. Assigns partner organizations to the crisis. 

5. Monitors response progress and updates. 

### **4.2 Citizen assistance workflow** 

6. Citizen submits an assistance request. 

7. System records the request and returns a reference number where applicable. 

8. AI may classify the request and estimate urgency. 

9. Authorized officer reviews and verifies the request. 

10. Request is assigned to a suitable organization. 

11. Organization prepares and delivers assistance. 

12. Organization records progress/completion and citizen receives an update. 

### **4.3 Resource management workflow** 

13. Organization registers a warehouse. 

14. Organization records available inventory. 

15. An allocation need or request is received. 

16. Authorized staff allocate the required resources. 

17. Resources are dispatched and delivery is recorded. 

18. Stock balances and movement history are updated. 

### **4.4 Volunteer coordination workflow** 

19. Volunteer registers. 

20. Organization reviews the volunteer information. 

21. Manager assigns a suitable task. 

22. Volunteer accepts or acknowledges the assignment, where the workflow supports it. 

23. Volunteer updates task progress. 

24. Task is marked complete and recorded in history. 

### **4.5 AI decision-support workflow** 

25. System receives relevant crisis/request data. 

26. AI analyzes the available data. 

27. AI generates a recommendation with supporting explanation. 

28. Authorized officer reviews the recommendation. 

29. Officer accepts, rejects or modifies it. 

30. Human decision and audit information are recorded. 

## **5. Navigation and application layout** 

### **5.1 Recommended dashboard layout** 

- Left sidebar: primary navigation and module groups. 

- Top navigation: global search, notifications, profile and organization switcher where relevant. 

- Main content: page title, breadcrumbs, filters, primary action and page content. 

- Optional contextual panel: activity feed, quick actions or contextual help. 

### **5.2 Central Admin sidebar proposal** 

Dashboard Crisis Management 

HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

- All Crises - Create Crisis - Crisis Areas - Crisis Map Assistance Requests - All Requests - Pending Verification - Assignments Organizations - All Organizations - Approvals - Memberships Resource Management - Resources - Allocations - Dispatches Shelters Volunteers Donations AI Decision Support Reports & Analytics User Management - Users - Roles - Permissions Notifications Audit Logs Settings 

**5.3 Organization Portal sidebar proposal** 

Dashboard My Organization - Profile - Members - Membership Requests Assigned Crises Assistance Requests Resource Management - Warehouses - Inventory - Stock Movements - Allocations Shelters Volunteers Donations AI Recommendations Reports Notifications Settings 

**Permission-based navigation** Navigation items must be filtered by role and permission. For example, a volunteer manager may not need warehouse 

HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

administration. A user who belongs to several organizations should be able to switch organization context, and the interface must make the active organization visible. 

## **6. UI/UX design system** 

### **6.1 Visual direction** 

Recommended visual direction: humanitarian, professional, trustworthy, calm under pressure, and easy to scan. Avoid overly decorative layouts, especially in emergency operations screens. 

|**Token / element**|**Recommendation**|
|---|---|
|Primary colour|Navy blue (example: #17365D)|
|Secondary colour|Blue (example: #2563EB)|
|Success|Green (example: #0F766E or a consistent green token)|
|Warning|Amber (example: #F59E0B)|
|Critical / danger|Red (example: #DC2626)|
|Background|White and light neutral grey (example: #F8FAFC)|
|Typography|Inter or another readable sans-serif font|
|Border radius|Approximately 8–12 px; use consistently|
|Layout|Clean responsive dashboard layout|
|Icons|Lucide-style consistent line icons|



### **6.2 Shared reusable Figma components** 

- Sidebar navigation 

- Top navigation bar 

- KPI / statistic cards 

- Data tables 

- Search bars 

- Filter panels 

- Status badges 

- Priority badges 

- Form inputs 

- Dropdowns 

- Date pickers 

- Confirmation dialogs 

- Modal windows 

- Tabs 

- Charts 

- Map markers 

- Notification cards 

- Timeline components 

- File upload component 

- Pagination controls 

### **6.3 Required design states** 

- Default state 

- Loading state 

- Empty state 

- Error state 

- Success state 

HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

- Form validation state 

- Unauthorized / access denied state 

- Responsive mobile state 

For example, design the Requests page with records, with no records, while loading, and when a request fails. Do not provide only a single ideal-state mockup. 

### **6.4 Responsive design** 

Use a desktop-first reference frame of approximately 1440 px for administrative dashboards, but also provide tablet and mobile behavior. Public and citizen flows should be particularly usable on mobile devices. Tables may need responsive card views or controlled horizontal scrolling. 

## **7. Suggested Figma work allocation** 

The following is a proposed division for a six-member group. It can be adjusted based on each member's workload and strengths. 

|**Member**|**Assigned design area**|**Expected scope**|
|---|---|---|
|Hasiru|Public & Citizen Portal|Landing page, crisis information,<br>login/register, guest assistance request,<br>tracking, citizen dashboard and profile.|
|Sineth|Central Administration|Central dashboard, crisis management,<br>request verification, organizations, users,<br>roles and permissions.|
|Natheesha|Organization Portal|Organization dashboard, profile,<br>memberships, assigned crises, request<br>processing and organization settings.|
|Shenali|Resources & Shelters|Warehouses, inventory, stock movements,<br>allocation, dispatch and shelter<br>management.|
|Nethmi|Volunteers, Donations & Reports|Volunteer management, task assignment,<br>donation management, reports and analytics.|
|Hiran|Architecture & UI/UX Integration|AI decision support, shared design system,<br>consistency review, Figma integration,<br>backend alignment and React integration<br>planning.|



##### **Coordination rule** 

All members should use the same shared Figma design system and naming conventions. Each member should communicate required fields, actions, statuses and permission assumptions to the backend/frontend lead before finalizing complex forms. 

## **8. Recommended Figma file structure** 

HCMS - UI/UX Design 

- ├── 00 - Cover & Project Overview 

- ├── 01 - Design System 

- │├── Colors 

- │├── Typography 

- │├── 

   - Icons 

- │├── Buttons 

- │├── 

   - Forms 

- │├── Tables 

- │└── Components 

- ├── 02 - Public Portal 

HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

- ├── 03 - Citizen Portal 

- ├── 04 - Central Administration 

- ├── 05 - Organization Portal 

- ├── 06 - Resource & Warehouse 

- ├── 07 - Shelter Management 

- ├── 08 - Volunteer Management ├── 09 - Donation Management 

- ├── 10 - AI Decision Support 

- ├── 11 - Reports & Analytics 

- ├── 12 - Common Components 

- └── 13 - Mobile Responsive Designs 

Use the page IDs (PUB-01, CIT-01, ADM-01, etc.) in Figma frame names. This makes design reviews, issue tracking and later React implementation easier. 

## **9. Figma design deliverables and quality checklist** 

- Complete page designs for the assigned module. 

- Desktop layout using a consistent reference width (recommended: 1440 px for dashboards). 

- Tablet and mobile responsive layouts or documented responsive behavior. 

- Navigation and page-to-page connections. 

- Forms, tables, filters and modal/dialog designs. 

- Loading, empty, success and error states. 

- Reusable Figma components and shared styles. 

- Prototype demonstrating the main user workflow. 

- Backend data requirements / fields list. 

- Notes for validation rules, status transitions and permission restrictions. 

### **9.1 Review criteria** 

- Does the screen support a real user task? 

- Are the primary action and page purpose clear? 

- Are field labels and validation understandable? 

- Are status and priority indicators consistent? 

- Does the screen respect role/organization scope? 

- Is the layout usable on smaller screens? 

- Does the design use shared components rather than one-off styles? 

- Are loading, empty and error conditions considered? 

## **10. Development priorities** 

|**Priority**|**Modules / work**|**Reason**|
|---|---|---|
|P0|Design system and authentication|Foundation for all portals and protected<br>routes.|
|P1|Public portal, citizen portal and central<br>dashboard|Core entry points and system overview.|
|P2|Crisis management and assistance requests|Main crisis-response workflow.|
|P3|Organizations, memberships and RBAC|Multi-organization coordination and secure<br>access.|
|P4|Resources, warehouses and shelters|Operational delivery and capacity<br>management.|
|P5|Volunteers, donations and reports|Supporting operational modules.|
|P6|AI decision support|Advanced features built on reliable<br>operational data.|



HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

##### **Parallel development recommendation** 

Do not wait for every Figma screen to be completed before starting React. Approve and implement one module at a time. Use realistic mock data while the corresponding APIs are not ready, then integrate real API responses when available. 

## **11. Backend–frontend alignment** 

|**Backend entity / concept**|**Related frontend screens**<br>i|
|---|---|
|User|Registration, Login, Profile, User Management|
|Role|Role Management|
|Permission|Permission Management|
|UserRole|User Role Assignment|
|Organization|Organization Management, Organization Profile|
|OrganizationMembership|Organization Members, Membership Requests|
|OrganizationMembershipRole|Organization Role Assignment|
|CrisisEvent|Crisis Management, Crisis Details, Public Crisis Information|
|Area<br>i|Crisis Areas, Location Selection, Crisis Map|
|AssistanceRequest (planned / confirm implementation)|Submit Request, Request Management, Request Details, Tracking|
|Resource / Inventory (planned / confirm implementation)|Inventory Management, Resource Overview|
|Warehouse (planned / confirm implementation)<br>i|Warehouse Management|
|Shelter (planned / confirm implementation)|Shelter Management and Shelter Finder|
|Volunteer (planned / confirm implementation)|Volunteer Management and Volunteer Portal|
|AIRecommendation (planned / confirm implementation)|AI Dashboard and Recommendation Details|
|HumanDecision (planned / confirm implementation)|Human Decision Review and Audit History|



##### **Important backend scope distinction** 

The first group of entities (User, Role, UserRole, CrisisEvent, Organization, OrganizationMembership, OrganizationMembershipRole, Permission and RolePermission) were part of the previously discussed backend foundation/expansion. Other modules in this table are frontend requirements or planned domain concepts and must not be assumed to exist in the current database until confirmed. 

### **11.1 Questions to resolve during API design** 

- What exact fields are required for each create/edit form? 

- Which fields are read-only or system-generated? 

- What are the allowed status values and transitions? 

- Which roles can view, create, edit, approve, assign or delete each record? 

- How is organization context selected and validated? 

- How is guest request tracking securely verified? 

- What file types and upload limits are allowed? 

- Which endpoints support filtering, sorting, pagination and search? 

- What is the expected error response format? 

- Which operations require audit logging? 

## **12. Sri Lankan geography and localization** 

Design location selection and filtering around a useful Sri Lankan administrative hierarchy: 

- Province 

- District 

- Divisional Secretariat (DS) Division 

- Grama Niladhari (GN) Division 

HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

- Village / local area 

Crisis creation, request submission, maps and reports should support location selection and filtering at appropriate levels. Use map visualization where it genuinely helps. 

Reserve space and test layouts for Sinhala, Tamil and English localization. The first release may use English, but buttons, navigation labels, tables and forms should be designed so longer translated text does not break the interface. 

## **13. Recommended first Figma milestone** 

To start implementation quickly and validate the visual language, prioritize these 15 screens: 

31. Public Landing Page 

32. Login 

33. Registration 

34. Citizen Dashboard 

35. Submit Assistance Request 

36. Track Request 

37. Central Admin Dashboard 

38. Crisis Management List 

39. Create Crisis 

40. Crisis Details 

41. Assistance Request Management 

42. Request Verification 

43. Organization Dashboard 

44. Organization Management 

45. Warehouse & Inventory Dashboard 

- Once these screens are reviewed and the shared components are stable, continue with the remaining modules using the same design system. 

## **14. Implementation principles and assumptions** 

- One React application with shared components and role-/permission-based portals is the recommended approach. 

- Authentication and authorization must be enforced by the backend; hiding a menu item in React is not sufficient security. 

- Frontend forms and tables must reflect actual backend fields, validation, relationships and workflow rules. 

- Use mock data only as a temporary integration aid; clearly separate mock services/data from production API calls. 

- Do not show fabricated AI accuracy, confidence, crisis counts or live status as real system data. 

- Protect sensitive citizen information. Show only the minimum personal data needed for a user's task and permission scope. 

- Maps, location details and operational information should be presented with clear source/time context when relevant. 

- Keep auditability in mind for approvals, assignments, stock movements, dispatches and AI-assisted decisions. 

- Treat the page inventory as a product design baseline. Final scope should be reconciled with project requirements, available development time and backend feasibility. 

## **Appendix: Suggested Figma naming convention** 

|**Example frame name**|**Meaning**|
|---|---|
|PUB-01 / Landing / Desktop|Public landing page desktop frame.|
|CIT-02 / Submit Request / Mobile|Citizen request submission mobile frame.|
|ADM-01 / Dashboard / Desktop|Central admin dashboard desktop frame.|
|ORG-12 / Inventory / Empty State|Organization inventory empty state.|



HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

**HUMANITARIAN CRISIS MANAGEMENT SYSTEM  |  FRONTEND UI/UX SPECIFICATION** 

AI-11 / Recommendation Details / Review 

AI recommendation detail during human review. 

##### **END OF SPECIFICATION** 

HCMS • Frontend UI/UX Specification v1.0 • 13 November 2026 

