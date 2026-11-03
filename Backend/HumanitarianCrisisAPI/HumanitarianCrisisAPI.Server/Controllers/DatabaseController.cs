using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HumanitarianCrisisAPI.Data;

namespace HumanitarianCrisisAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DatabaseController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DatabaseController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("test")]
    public async Task<IActionResult> TestConnection()
    {
        bool connected =
            await _context.Database.CanConnectAsync();

        return Ok(new
        {
            DatabaseConnected = connected
        });
    }
}