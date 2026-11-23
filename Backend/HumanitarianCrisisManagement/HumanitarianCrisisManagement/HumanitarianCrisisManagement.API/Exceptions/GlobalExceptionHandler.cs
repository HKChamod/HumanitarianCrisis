
using HumanitarianCrisisManagement.Application.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Exceptions;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(
        ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var statusCode = exception switch
        {
            UnauthorizedAccessException =>
                StatusCodes.Status401Unauthorized,

            KeyNotFoundException =>
                StatusCodes.Status404NotFound,

            ArgumentException =>
                StatusCodes.Status400BadRequest,

            InvalidOperationException =>
                StatusCodes.Status400BadRequest,

            AiProviderUnavailableException =>
                StatusCodes.Status503ServiceUnavailable,

            _ => StatusCodes.Status500InternalServerError
        };

        _logger.LogError(
            exception,
            "An exception occurred. StatusCode: {StatusCode}",
            statusCode);

        var title = statusCode switch
        {
            401 => "Unauthorized",
            404 => "Resource not found",
            400 => "Bad request",
            503 => "AI service unavailable",
            _ => "An unexpected error occurred."
        };

        var detail = statusCode switch
        {
            400 or 404 or 503 => exception.Message,
            _ => null
        };

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail
        };

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/problem+json";

        await httpContext.Response.WriteAsJsonAsync(
            problemDetails,
            cancellationToken);

        return true;
    }
}
