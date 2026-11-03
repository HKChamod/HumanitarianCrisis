# Humanitarian Crisis Management System

A software system designed to coordinate and manage emergency response operations, incident reporting, resource allocation, and assistance requests during humanitarian crises.

---

## 🏛️ Architecture Overview

The backend is built with **.NET 9** following **Clean Architecture (Onion Architecture)** principles to ensure separation of concerns, testability, and maintainability:

```text
HumanitarianCrisis/
├── Backend/
│   └── HumanitarianCrisisManagement/
│       └── HumanitarianCrisisManagement/
│           ├── HumanitarianCrisisManagement.API/             # Presentation layer (REST Controllers, Swagger)
│           ├── HumanitarianCrisisManagement.Application/     # Application layer (Commands, Queries, DTOs, Interfaces)
│           ├── HumanitarianCrisisManagement.Domain/          # Domain layer (Entities, Enums, Value Objects)
│           ├── HumanitarianCrisisManagement.Infrastructure/  # Infrastructure layer (EF Core, SQL Server, Repositories)
│           └── HumanitarianCrisisManagement.sln
├── DataBase/
│   └── HumanitarianCrisisDataBase/
│       └── HumanitarianCrisisDataBase/                       # SSDT SQL Server Database Project (.sqlproj)
├── Frontend/                                                 # Client-side web application (SPA)
├── .github/
│   └── workflows/                                            # CI/CD workflows (GitHub Actions)
├── .editorconfig                                             # Code formatting standards
├── .gitattributes                                            # Line ending normalization
└── .gitignore                                                # Git ignore rules for .NET, SSDT, Node, IDEs
```

### Core Domain Entities
- **User**: User profiles, contact details, status, and role bindings.
- **Role & UserRole**: Role-based access control (RBAC).
- **CrisisEvent**: Crisis incidents, severities, locations, and descriptions.
- **AssistanceRequest**: Aid requests submitted during emergencies.

---

## 🚀 Getting Started

### Prerequisites
* [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
* [SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (or LocalDB / SQL Server Express)
* [Visual Studio 2022 (v17.12+)](https://visualstudio.microsoft.com/) or [VS Code](https://code.visualstudio.com/) with C# Dev Kit
* [EF Core CLI Tools](https://learn.microsoft.com/en-us/ef/core/cli/dotnet):
  ```bash
  dotnet tool install --global dotnet-ef
  ```

---

### Configuration & Database Setup

1. **Configure Connection String**:
   Navigate to the API project at:
   `Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement/HumanitarianCrisisManagement.API/appsettings.json`

   Ensure your connection string matches your SQL Server instance:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=localhost;Database=HumanitarianCrisisDB;Trusted_Connection=True;TrustServerCertificate=True;"
     }
   }
   ```
   *(A reference template is available at `appsettings.Example.json`)*.

2. **Apply Migrations**:
   Run the following command from the solution folder to apply database migrations:
   ```bash
   cd Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement
   dotnet ef database update --project HumanitarianCrisisManagement.Infrastructure --startup-project HumanitarianCrisisManagement.API
   ```

---

### Running the API

From the solution directory:
```bash
cd Backend/HumanitarianCrisisManagement/HumanitarianCrisisManagement
dotnet run --project HumanitarianCrisisManagement.API
```

Once running, access Swagger UI in your browser:
* **HTTPS**: [https://localhost:7104/swagger](https://localhost:7104/swagger)
* **HTTP**: [http://localhost:5107/swagger](http://localhost:5107/swagger)

---

## 🛠️ Project Structure & Workflows

| Folder / Component | Description |
| :--- | :--- |
| `Domain` | Enterprise business logic, entities, and domain rules. Free of external dependencies. |
| `Application` | Business use cases, data transfer objects (DTOs), and service interfaces. |
| `Infrastructure` | Data access with EF Core, database migrations, configurations, and external integrations. |
| `API` | HTTP API endpoints, middleware, dependency injection configuration, and Swagger UI. |
| `DataBase` | SQL Server Database Project for schema versioning and deployment artifacts. |
| `Frontend` | Target directory for the client user interface. |

---

## 📄 License
This project is developed for academic and humanitarian crisis management purposes.
