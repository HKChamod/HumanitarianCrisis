using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace HumanitarianCrisisManagement.Tests;

public class PublicPortalTests
{
    private static readonly string TestJwtKey = Convert.ToBase64String(
        Encoding.UTF8.GetBytes("TEST_ONLY_SYNTHETIC_JWT_KEY_32_BYTES_LONG!!"));

    [Fact]
    public async Task PublicNotices_GuestSubmit_Track_And_ForgotPassword_WorkEndToEnd()
    {
        await using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("ConnectionStrings:DefaultConnection", "DataSource=:memory:");
            builder.UseSetting("Jwt:Key", TestJwtKey);
            builder.UseSetting("Jwt:Issuer", "HumanitarianCrisisManagementAPI");
            builder.UseSetting("Jwt:Audience", "HumanitarianCrisisManagementClient");
            builder.UseSetting("Jwt:AccessTokenExpirationMinutes", "60");
            builder.UseSetting("AiProvider:Provider", "None");
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
                services.AddDbContext<ApplicationDbContext>(opts => opts.UseSqlite(connection));
            });
        });

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.Database.EnsureCreatedAsync();

            db.Areas.Add(new Area { AreaName = "Kalutara", AreaType = "District", IsActive = true });
            db.CrisisEvents.Add(new CrisisEvent
            {
                CrisisName = "Kalutara Flood Alert",
                CrisisType = "Flood",
                SeverityLevel = "High",
                Status = "Active",
                LocationName = "Kalutara",
                StartDate = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        using var client = factory.CreateClient();

        // 1. Public notices
        var noticesRes = await client.GetAsync("/api/public/notices");
        Assert.Equal(HttpStatusCode.OK, noticesRes.StatusCode);

        // 2. Guest assistance submission
        var submitRes = await client.PostAsJsonAsync("/api/public/assistance-requests", new
        {
            category = "Food",
            description = "Need dry rations for 4 people",
            peopleAffected = 4,
            urgencyLevel = "High",
            districtName = "Kalutara",
            contactName = "Nimal Perera",
            contactPhone = "+94771234567"
        });
        Assert.Equal(HttpStatusCode.Created, submitRes.StatusCode);
        var submitJson = await submitRes.Content.ReadFromJsonAsync<JsonElement>();
        var refNumber = submitJson.GetProperty("data").GetProperty("referenceNumber").GetString();
        Assert.False(string.IsNullOrWhiteSpace(refNumber));

        // 3. Track with matching phone -> 200
        var trackOk = await client.PostAsJsonAsync("/api/public/assistance-requests/track", new
        {
            referenceNumber = refNumber,
            verificationPhone = "4567"
        });
        Assert.Equal(HttpStatusCode.OK, trackOk.StatusCode);

        // 4. Track with wrong phone -> 403
        var trackBad = await client.PostAsJsonAsync("/api/public/assistance-requests/track", new
        {
            referenceNumber = refNumber,
            verificationPhone = "9999"
        });
        Assert.Equal(HttpStatusCode.Forbidden, trackBad.StatusCode);

        // 5. Forgot password -> 200
        var forgotRes = await client.PostAsJsonAsync("/api/Auth/forgot-password", new
        {
            email = "nonexistent@test.local"
        });
        Assert.Equal(HttpStatusCode.OK, forgotRes.StatusCode);
    }
}
