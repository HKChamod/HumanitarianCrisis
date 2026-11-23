using HumanitarianCrisisManagement.Application.DTOs.Volunteers;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class VolunteerService : IVolunteerService
{
    private static readonly string[] ValidAvailability = ["Available", "Deployed", "Unavailable"];
    private static readonly string[] ValidApprovals = ["Pending", "Approved", "Rejected"];
    private static readonly string[] ValidAssignmentStatuses = ["Assigned", "Active", "Completed", "Cancelled"];

    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly INotificationService _notificationService;

    public VolunteerService(
        ApplicationDbContext context,
        IAuditLogService auditLogService,
        INotificationService notificationService)
    {
        _context = context;
        _auditLogService = auditLogService;
        _notificationService = notificationService;
    }

    public async Task<IReadOnlyList<VolunteerResponse>> GetAllAsync(
        string? availabilityStatus = null,
        string? approvalStatus = null)
    {
        var query = _context.Volunteers
            .AsNoTracking()
            .Include(v => v.Area)
            .Include(v => v.Assignments)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(availabilityStatus))
            query = query.Where(v => v.AvailabilityStatus == availabilityStatus.Trim());

        if (!string.IsNullOrWhiteSpace(approvalStatus))
            query = query.Where(v => v.ApprovalStatus == approvalStatus.Trim());

        var items = await query
            .OrderByDescending(v => v.CreatedAt)
            .ToListAsync();

        return items.Select(MapVolunteer).ToList();
    }

    public async Task<VolunteerResponse> GetByIdAsync(int volunteerId)
    {
        var volunteer = await _context.Volunteers
            .AsNoTracking()
            .Include(v => v.Area)
            .Include(v => v.Assignments)
            .FirstOrDefaultAsync(v => v.VolunteerId == volunteerId);

        if (volunteer == null)
            throw new KeyNotFoundException("Volunteer not found.");

        return MapVolunteer(volunteer);
    }

    public async Task<VolunteerResponse> RegisterAsync(CreateVolunteerRequest request, int? actorUserId)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var exists = await _context.Volunteers.AnyAsync(v => v.Email.ToLower() == normalizedEmail);
        if (exists)
            throw new InvalidOperationException("A volunteer with this email address is already registered.");

        if (request.AreaId.HasValue)
        {
            var areaExists = await _context.Areas.AnyAsync(a => a.AreaId == request.AreaId.Value);
            if (!areaExists)
                throw new KeyNotFoundException("Selected area not found.");
        }

        var availability = NormalizeAllowed(request.AvailabilityStatus, ValidAvailability, "Available", "availability status");

        var volunteer = new Volunteer
        {
            UserId = actorUserId,
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            PhoneNumber = request.PhoneNumber?.Trim(),
            AreaId = request.AreaId,
            Skills = request.Skills.Trim(),
            AvailabilityStatus = availability,
            ApprovalStatus = "Pending",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Volunteers.Add(volunteer);
        await _context.SaveChangesAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            "Volunteer.Registered",
            "Volunteer",
            volunteer.VolunteerId.ToString(),
            $"Registered volunteer #{volunteer.VolunteerId} with availability '{volunteer.AvailabilityStatus}'.");

        await _notificationService.NotifyUsersByRoleAsync(
            "Administrator",
            "New Volunteer Registration",
            $"Volunteer #{volunteer.VolunteerId} registered and is awaiting approval.",
            "Volunteer",
            "Info",
            "Volunteer",
            volunteer.VolunteerId);

        return await GetByIdAsync(volunteer.VolunteerId);
    }

    public async Task<VolunteerResponse> UpdateAsync(int volunteerId, UpdateVolunteerRequest request, int actorUserId)
    {
        var volunteer = await _context.Volunteers.FirstOrDefaultAsync(v => v.VolunteerId == volunteerId);
        if (volunteer == null)
            throw new KeyNotFoundException("Volunteer not found.");

        if (request.AreaId.HasValue)
        {
            var areaExists = await _context.Areas.AnyAsync(a => a.AreaId == request.AreaId.Value);
            if (!areaExists)
                throw new KeyNotFoundException("Selected area not found.");
        }

        volunteer.FullName = request.FullName.Trim();
        volunteer.PhoneNumber = request.PhoneNumber?.Trim();
        volunteer.AreaId = request.AreaId;
        volunteer.Skills = request.Skills.Trim();
        volunteer.AvailabilityStatus = NormalizeAllowed(request.AvailabilityStatus, ValidAvailability, volunteer.AvailabilityStatus, "availability status");
        volunteer.IsActive = request.IsActive;
        volunteer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            "Volunteer.Updated",
            "Volunteer",
            volunteer.VolunteerId.ToString(),
            $"Updated volunteer #{volunteer.VolunteerId} (availability '{volunteer.AvailabilityStatus}', active={volunteer.IsActive}).");

        return await GetByIdAsync(volunteer.VolunteerId);
    }

    public async Task<VolunteerResponse> UpdateApprovalAsync(
        int volunteerId,
        UpdateVolunteerApprovalRequest request,
        int actorUserId)
    {
        var volunteer = await _context.Volunteers.FirstOrDefaultAsync(v => v.VolunteerId == volunteerId);
        if (volunteer == null)
            throw new KeyNotFoundException("Volunteer not found.");

        var approval = NormalizeAllowed(request.ApprovalStatus, ValidApprovals, "Approved", "approval status");
        if (approval == "Pending")
            throw new ArgumentException("Approval decision must be Approved or Rejected.");

        volunteer.ApprovalStatus = approval;
        volunteer.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            $"Volunteer.{approval}",
            "Volunteer",
            volunteer.VolunteerId.ToString(),
            $"Set volunteer #{volunteer.VolunteerId} approval status to {approval}.");

        if (volunteer.UserId.HasValue)
        {
            await _notificationService.CreateAsync(new Application.DTOs.Notifications.CreateNotificationRequest
            {
                UserId = volunteer.UserId.Value,
                Title = $"Volunteer Application {approval}",
                Message = $"Your volunteer registration has been {approval.ToLowerInvariant()}.",
                Category = "Volunteer",
                Severity = approval == "Approved" ? "Success" : "Warning",
                RelatedEntityType = "Volunteer",
                RelatedEntityId = volunteer.VolunteerId
            });
        }

        return await GetByIdAsync(volunteer.VolunteerId);
    }

    public async Task<IReadOnlyList<VolunteerAssignmentResponse>> GetAssignmentsAsync(
        int? volunteerId = null,
        int? crisisId = null)
    {
        var query = _context.VolunteerAssignments
            .AsNoTracking()
            .Include(a => a.Volunteer)
            .Include(a => a.Crisis)
            .Include(a => a.AssignedByUser)
            .AsQueryable();

        if (volunteerId.HasValue)
            query = query.Where(a => a.VolunteerId == volunteerId.Value);

        if (crisisId.HasValue)
            query = query.Where(a => a.CrisisId == crisisId.Value);

        var items = await query
            .OrderByDescending(a => a.AssignedAt)
            .ToListAsync();

        return items.Select(MapAssignment).ToList();
    }

    public async Task<VolunteerAssignmentResponse> CreateAssignmentAsync(
        CreateVolunteerAssignmentRequest request,
        int actorUserId)
    {
        var volunteer = await _context.Volunteers.FirstOrDefaultAsync(v => v.VolunteerId == request.VolunteerId);
        if (volunteer == null)
            throw new KeyNotFoundException("Volunteer not found.");

        if (!volunteer.IsActive || !string.Equals(volunteer.ApprovalStatus, "Approved", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Only active, approved volunteers can be assigned to crisis operations.");

        if (string.Equals(volunteer.AvailabilityStatus, "Unavailable", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Unavailable volunteers cannot be assigned.");

        var crisis = await _context.CrisisEvents.AsNoTracking().FirstOrDefaultAsync(c => c.CrisisId == request.CrisisId);
        if (crisis == null)
            throw new KeyNotFoundException("Crisis event not found.");

        if (string.Equals(crisis.Status, "Closed", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(crisis.Status, "Resolved", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Cannot assign volunteers to a closed or resolved crisis event.");
        }

        // Prevent duplicate active assignment for the same volunteer + crisis
        var duplicateExists = await _context.VolunteerAssignments.AnyAsync(a =>
            a.VolunteerId == request.VolunteerId &&
            a.CrisisId == request.CrisisId &&
            (a.Status == "Assigned" || a.Status == "Active"));

        if (duplicateExists)
            throw new InvalidOperationException("This volunteer already has an active assignment for the selected crisis event.");

        var assignment = new VolunteerAssignment
        {
            VolunteerId = request.VolunteerId,
            CrisisId = request.CrisisId,
            RoleTitle = request.RoleTitle.Trim(),
            TaskDescription = request.TaskDescription?.Trim(),
            Status = "Assigned",
            AssignedByUserId = actorUserId,
            AssignedAt = DateTime.UtcNow,
            Notes = request.Notes?.Trim()
        };

        volunteer.AvailabilityStatus = "Deployed";
        volunteer.UpdatedAt = DateTime.UtcNow;

        _context.VolunteerAssignments.Add(assignment);
        await _context.SaveChangesAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            "Volunteer.Assigned",
            "VolunteerAssignment",
            assignment.AssignmentId.ToString(),
            $"Assigned volunteer #{volunteer.VolunteerId} to crisis #{crisis.CrisisId} as '{assignment.RoleTitle}'.");

        if (volunteer.UserId.HasValue)
        {
            await _notificationService.CreateAsync(new Application.DTOs.Notifications.CreateNotificationRequest
            {
                UserId = volunteer.UserId.Value,
                Title = "New Crisis Assignment",
                Message = $"You have been assigned to '{crisis.CrisisName}' as {assignment.RoleTitle}.",
                Category = "Volunteer",
                Severity = "Info",
                RelatedEntityType = "VolunteerAssignment",
                RelatedEntityId = assignment.AssignmentId
            });
        }

        var loaded = await _context.VolunteerAssignments
            .AsNoTracking()
            .Include(a => a.Volunteer)
            .Include(a => a.Crisis)
            .Include(a => a.AssignedByUser)
            .FirstAsync(a => a.AssignmentId == assignment.AssignmentId);

        return MapAssignment(loaded);
    }

    public async Task<VolunteerAssignmentResponse> UpdateAssignmentStatusAsync(
        int assignmentId,
        UpdateVolunteerAssignmentStatusRequest request,
        int actorUserId)
    {
        var assignment = await _context.VolunteerAssignments
            .Include(a => a.Volunteer)
            .Include(a => a.Crisis)
            .Include(a => a.AssignedByUser)
            .FirstOrDefaultAsync(a => a.AssignmentId == assignmentId);

        if (assignment == null)
            throw new KeyNotFoundException("Volunteer assignment not found.");

        if (assignment.Status == "Completed" || assignment.Status == "Cancelled")
            throw new InvalidOperationException("Completed or cancelled assignments cannot be modified.");

        var nextStatus = NormalizeAllowed(request.Status, ValidAssignmentStatuses, assignment.Status, "assignment status");
        assignment.Status = nextStatus;
        if (!string.IsNullOrWhiteSpace(request.Notes))
            assignment.Notes = request.Notes.Trim();

        if (nextStatus == "Completed" || nextStatus == "Cancelled")
        {
            assignment.CompletedAt = DateTime.UtcNow;

            var hasOtherActive = await _context.VolunteerAssignments.AnyAsync(a =>
                a.VolunteerId == assignment.VolunteerId &&
                a.AssignmentId != assignment.AssignmentId &&
                (a.Status == "Assigned" || a.Status == "Active"));

            if (!hasOtherActive && assignment.Volunteer.AvailabilityStatus == "Deployed")
            {
                assignment.Volunteer.AvailabilityStatus = "Available";
                assignment.Volunteer.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            $"Volunteer.Assignment{nextStatus}",
            "VolunteerAssignment",
            assignment.AssignmentId.ToString(),
            $"Updated volunteer assignment #{assignment.AssignmentId} status to {nextStatus}.");

        return MapAssignment(assignment);
    }

    private static string NormalizeAllowed(string? value, string[] allowed, string fallback, string fieldName)
    {
        var trimmed = string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        var match = allowed.FirstOrDefault(a => a.Equals(trimmed, StringComparison.OrdinalIgnoreCase));
        if (match == null)
            throw new ArgumentException($"Invalid {fieldName} '{trimmed}'. Allowed: {string.Join(", ", allowed)}.");
        return match;
    }

    private static VolunteerResponse MapVolunteer(Volunteer v) => new()
    {
        VolunteerId = v.VolunteerId,
        UserId = v.UserId,
        FullName = v.FullName,
        Email = v.Email,
        PhoneNumber = v.PhoneNumber,
        AreaId = v.AreaId,
        AreaName = v.Area?.AreaName,
        Skills = v.Skills,
        AvailabilityStatus = v.AvailabilityStatus,
        ApprovalStatus = v.ApprovalStatus,
        IsActive = v.IsActive,
        ActiveAssignmentsCount = v.Assignments.Count(a => a.Status == "Assigned" || a.Status == "Active"),
        CreatedAt = v.CreatedAt,
        UpdatedAt = v.UpdatedAt
    };

    private static VolunteerAssignmentResponse MapAssignment(VolunteerAssignment a) => new()
    {
        AssignmentId = a.AssignmentId,
        VolunteerId = a.VolunteerId,
        VolunteerName = a.Volunteer.FullName,
        CrisisId = a.CrisisId,
        CrisisName = a.Crisis.CrisisName,
        RoleTitle = a.RoleTitle,
        TaskDescription = a.TaskDescription,
        Status = a.Status,
        AssignedByUserId = a.AssignedByUserId,
        AssignedByUserName = a.AssignedByUser.FullName,
        AssignedAt = a.AssignedAt,
        CompletedAt = a.CompletedAt,
        Notes = a.Notes
    };
}
