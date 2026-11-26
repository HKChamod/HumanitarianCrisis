using HumanitarianCrisisManagement.Application.DTOs.Organizations;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class OrganizationWorkspaceService : IOrganizationWorkspaceService
{
    private static readonly string[] ValidTeamStatuses = ["Available", "Deployed", "Unavailable", "Inactive"];
    private static readonly Dictionary<string, string[]> AllowedRequestTransitions = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Pending"] = ["Verified", "Rejected"],
        ["Verified"] = ["Assigned", "Rejected"],
        ["Assigned"] = ["Fulfilled"],
        ["Fulfilled"] = [],
        ["Rejected"] = [],
    };

    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public OrganizationWorkspaceService(
        ApplicationDbContext context,
        IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    public async Task<OrganizationDashboardResponse> GetDashboardAsync(int organizationId)
    {
        var org = await _context.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.OrganizationId == organizationId)
            ?? throw new KeyNotFoundException($"Organization with ID {organizationId} was not found.");

        var memberships = await _context.OrganizationMemberships
            .AsNoTracking()
            .Where(m => m.OrganizationId == organizationId)
            .Select(m => new { m.MembershipId, m.UserId, m.MembershipStatus })
            .ToListAsync();

        var activeMembers = memberships.Count(m => m.MembershipStatus == "Approved");
        var pendingMembers = memberships.Count(m => m.MembershipStatus == "Pending");
        var memberUserIds = memberships.Where(m => m.MembershipStatus == "Approved").Select(m => m.UserId).ToList();

        var assignedAreaIds = await _context.OrganizationAreas
            .AsNoTracking()
            .Where(oa => oa.OrganizationId == organizationId && oa.AssignmentStatus == "Active")
            .Select(oa => oa.AreaId)
            .ToListAsync();

        var crises = await _context.CrisisEvents
            .AsNoTracking()
            .Select(c => new { c.CrisisId, c.Status, c.SeverityLevel })
            .ToListAsync();

        var activeCrisesCount = crises.Count(c =>
            string.Equals(c.Status, "Active", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(c.Status, "Reported", StringComparison.OrdinalIgnoreCase));
        var criticalCrisesCount = crises.Count(c =>
            string.Equals(c.SeverityLevel, "Critical", StringComparison.OrdinalIgnoreCase));

        var openRequestStatuses = new[] { "Pending", "Verified", "Assigned" };
        var openRequestsQuery = _context.CitizenRequests
            .AsNoTracking()
            .Where(r => openRequestStatuses.Contains(r.Status));

        var openAidRequestsCount = await openRequestsQuery.CountAsync();
        var scopedAidRequestsCount = assignedAreaIds.Count > 0
            ? await openRequestsQuery.CountAsync(r => assignedAreaIds.Contains(r.AreaId))
            : openAidRequestsCount;

        var teams = await _context.ResponseTeams
            .AsNoTracking()
            .Where(t => t.OrganizationId == organizationId)
            .Select(t => new { t.ResponseTeamId, t.Status })
            .ToListAsync();

        var assignedAllocationsCount = await _context.ResourceAllocations
            .AsNoTracking()
            .Where(a =>
                memberUserIds.Contains(a.RequestedByUserId) ||
                (a.CitizenRequest != null && assignedAreaIds.Contains(a.CitizenRequest.AreaId)))
            .CountAsync();

        var recentDeployments = await _context.ResponseTeamDeployments
            .AsNoTracking()
            .Where(d => d.OrganizationId == organizationId)
            .OrderByDescending(d => d.DeployedAt)
            .Take(5)
            .Select(d => new OrganizationActivityItem
            {
                Id = $"deploy-{d.DeploymentId}",
                Title = $"{d.ResponseTeam.TeamName}: {d.MissionTitle}",
                Description = $"Deployment {d.Status}",
                Category = "Deployment",
                OccurredAt = d.DeployedAt,
            })
            .ToListAsync();

        var recentMemberEvents = await _context.OrganizationMemberships
            .AsNoTracking()
            .Where(m => m.OrganizationId == organizationId)
            .OrderByDescending(m => m.ApprovedAt ?? m.JoinedAt)
            .Take(5)
            .Select(m => new OrganizationActivityItem
            {
                Id = $"member-{m.MembershipId}",
                Title = m.User.FullName,
                Description = $"Membership {m.MembershipStatus}",
                Category = "Membership",
                OccurredAt = m.ApprovedAt ?? m.JoinedAt,
            })
            .ToListAsync();

        var recentActivity = recentDeployments
            .Concat(recentMemberEvents)
            .OrderByDescending(a => a.OccurredAt)
            .Take(8)
            .ToList();

        return new OrganizationDashboardResponse
        {
            OrganizationId = org.OrganizationId,
            OrganizationName = org.OrganizationName,
            TotalMembers = memberships.Count,
            ActiveMembers = activeMembers,
            PendingMembers = pendingMembers,
            AssignedAreasCount = assignedAreaIds.Count,
            ActiveCrisesCount = activeCrisesCount,
            CriticalCrisesCount = criticalCrisesCount,
            OpenAidRequestsCount = openAidRequestsCount,
            ScopedAidRequestsCount = scopedAidRequestsCount,
            ResponseTeamsCount = teams.Count,
            AvailableTeamsCount = teams.Count(t => t.Status == "Available"),
            DeployedTeamsCount = teams.Count(t => t.Status == "Deployed"),
            AssignedAllocationsCount = assignedAllocationsCount,
            RecentActivity = recentActivity,
        };
    }

    public async Task<IReadOnlyList<ResponseTeamDto>> GetTeamsAsync(int organizationId)
    {
        await EnsureOrganizationExistsAsync(organizationId);

        var teams = await _context.ResponseTeams
            .AsNoTracking()
            .Where(t => t.OrganizationId == organizationId)
            .Include(t => t.LeaderMembership)
                .ThenInclude(m => m!.User)
            .Include(t => t.Area)
            .Include(t => t.Members)
                .ThenInclude(m => m.Membership)
                    .ThenInclude(ms => ms.User)
            .Include(t => t.Deployments)
                .ThenInclude(d => d.Crisis)
            .Include(t => t.Deployments)
                .ThenInclude(d => d.Area)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return teams.Select(MapTeamToDto).ToList();
    }

    public async Task<ResponseTeamDto> GetTeamByIdAsync(int organizationId, int teamId)
    {
        var team = await _context.ResponseTeams
            .AsNoTracking()
            .Where(t => t.OrganizationId == organizationId && t.ResponseTeamId == teamId)
            .Include(t => t.LeaderMembership)
                .ThenInclude(m => m!.User)
            .Include(t => t.Area)
            .Include(t => t.Members)
                .ThenInclude(m => m.Membership)
                    .ThenInclude(ms => ms.User)
            .Include(t => t.Deployments)
                .ThenInclude(d => d.Crisis)
            .Include(t => t.Deployments)
                .ThenInclude(d => d.Area)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"Response team #{teamId} was not found in this organization.");

        return MapTeamToDto(team);
    }

    public async Task<ResponseTeamDto> CreateTeamAsync(
        int organizationId,
        CreateResponseTeamRequest request,
        int actorUserId)
    {
        await EnsureOrganizationExistsAsync(organizationId);

        var teamName = request.TeamName.Trim();
        var duplicate = await _context.ResponseTeams
            .AnyAsync(t => t.OrganizationId == organizationId && t.TeamName == teamName);
        if (duplicate)
        {
            throw new InvalidOperationException($"A response team named '{teamName}' already exists in this organization.");
        }

        if (request.LeaderMembershipId.HasValue)
        {
            await EnsureApprovedOrgMembershipAsync(organizationId, request.LeaderMembershipId.Value);
        }

        if (request.AreaId.HasValue)
        {
            await EnsureAreaExistsAsync(request.AreaId.Value);
        }

        var team = new ResponseTeam
        {
            OrganizationId = organizationId,
            TeamName = teamName,
            TeamType = request.TeamType.Trim(),
            LeaderMembershipId = request.LeaderMembershipId,
            AreaId = request.AreaId,
            BaseStation = Normalize(request.BaseStation),
            ContactPhone = Normalize(request.ContactPhone),
            ContactEmail = Normalize(request.ContactEmail),
            SpecializedEquipment = Normalize(request.SpecializedEquipment),
            Status = ValidTeamStatuses.Contains(request.Status) ? request.Status : "Available",
            CreatedAt = DateTime.UtcNow,
        };

        _context.ResponseTeams.Add(team);
        await _context.SaveChangesAsync();

        if (request.LeaderMembershipId.HasValue)
        {
            _context.ResponseTeamMembers.Add(new ResponseTeamMember
            {
                ResponseTeamId = team.ResponseTeamId,
                MembershipId = request.LeaderMembershipId.Value,
                RoleInTeam = "Leader",
                JoinedAt = DateTime.UtcNow,
            });
            await _context.SaveChangesAsync();
        }

        await LogAuditAsync(
            actorUserId,
            "ResponseTeam.Created",
            "ResponseTeam",
            team.ResponseTeamId,
            $"Created response team '{team.TeamName}' for organization #{organizationId}.");

        return await GetTeamByIdAsync(organizationId, team.ResponseTeamId);
    }

    public async Task<ResponseTeamDto> UpdateTeamAsync(
        int organizationId,
        int teamId,
        UpdateResponseTeamRequest request,
        int actorUserId)
    {
        var team = await _context.ResponseTeams
            .FirstOrDefaultAsync(t => t.OrganizationId == organizationId && t.ResponseTeamId == teamId)
            ?? throw new KeyNotFoundException($"Response team #{teamId} was not found in this organization.");

        var teamName = request.TeamName.Trim();
        var duplicate = await _context.ResponseTeams
            .AnyAsync(t => t.OrganizationId == organizationId && t.TeamName == teamName && t.ResponseTeamId != teamId);
        if (duplicate)
        {
            throw new InvalidOperationException($"A response team named '{teamName}' already exists in this organization.");
        }

        if (request.LeaderMembershipId.HasValue)
        {
            await EnsureApprovedOrgMembershipAsync(organizationId, request.LeaderMembershipId.Value);
        }

        if (request.AreaId.HasValue)
        {
            await EnsureAreaExistsAsync(request.AreaId.Value);
        }

        team.TeamName = teamName;
        team.TeamType = request.TeamType.Trim();
        team.LeaderMembershipId = request.LeaderMembershipId;
        team.AreaId = request.AreaId;
        team.BaseStation = Normalize(request.BaseStation);
        team.ContactPhone = Normalize(request.ContactPhone);
        team.ContactEmail = Normalize(request.ContactEmail);
        team.SpecializedEquipment = Normalize(request.SpecializedEquipment);
        team.Status = ValidTeamStatuses.Contains(request.Status) ? request.Status : team.Status;
        team.UpdatedAt = DateTime.UtcNow;

        if (request.LeaderMembershipId.HasValue)
        {
            var existingMember = await _context.ResponseTeamMembers
                .FirstOrDefaultAsync(m => m.ResponseTeamId == teamId && m.MembershipId == request.LeaderMembershipId.Value);
            if (existingMember == null)
            {
                _context.ResponseTeamMembers.Add(new ResponseTeamMember
                {
                    ResponseTeamId = teamId,
                    MembershipId = request.LeaderMembershipId.Value,
                    RoleInTeam = "Leader",
                    JoinedAt = DateTime.UtcNow,
                });
            }
            else
            {
                existingMember.RoleInTeam = "Leader";
            }
        }

        await _context.SaveChangesAsync();

        await LogAuditAsync(
            actorUserId,
            "ResponseTeam.Updated",
            "ResponseTeam",
            team.ResponseTeamId,
            $"Updated response team '{team.TeamName}' (Status: {team.Status}).");

        return await GetTeamByIdAsync(organizationId, team.ResponseTeamId);
    }

    public async Task<ResponseTeamDto> UpdateTeamStatusAsync(
        int organizationId,
        int teamId,
        string status,
        int actorUserId)
    {
        if (!ValidTeamStatuses.Contains(status))
        {
            throw new ArgumentException($"Invalid team status '{status}'.");
        }

        var team = await _context.ResponseTeams
            .FirstOrDefaultAsync(t => t.OrganizationId == organizationId && t.ResponseTeamId == teamId)
            ?? throw new KeyNotFoundException($"Response team #{teamId} was not found in this organization.");

        team.Status = status;
        team.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await LogAuditAsync(
            actorUserId,
            "ResponseTeam.StatusUpdated",
            "ResponseTeam",
            team.ResponseTeamId,
            $"Updated response team '{team.TeamName}' status to '{status}'.");

        return await GetTeamByIdAsync(organizationId, teamId);
    }

    public async Task<ResponseTeamDto> AddTeamMemberAsync(
        int organizationId,
        int teamId,
        AddResponseTeamMemberRequest request,
        int actorUserId)
    {
        var team = await _context.ResponseTeams
            .FirstOrDefaultAsync(t => t.OrganizationId == organizationId && t.ResponseTeamId == teamId)
            ?? throw new KeyNotFoundException($"Response team #{teamId} was not found in this organization.");

        await EnsureApprovedOrgMembershipAsync(organizationId, request.MembershipId);

        var alreadyMember = await _context.ResponseTeamMembers
            .AnyAsync(m => m.ResponseTeamId == teamId && m.MembershipId == request.MembershipId);
        if (alreadyMember)
        {
            throw new InvalidOperationException("This organization member is already assigned to the response team.");
        }

        var roleInTeam = string.IsNullOrWhiteSpace(request.RoleInTeam) ? "Member" : request.RoleInTeam.Trim();
        _context.ResponseTeamMembers.Add(new ResponseTeamMember
        {
            ResponseTeamId = teamId,
            MembershipId = request.MembershipId,
            RoleInTeam = roleInTeam,
            JoinedAt = DateTime.UtcNow,
        });

        if (string.Equals(roleInTeam, "Leader", StringComparison.OrdinalIgnoreCase))
        {
            team.LeaderMembershipId = request.MembershipId;
        }

        team.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await LogAuditAsync(
            actorUserId,
            "ResponseTeam.MemberAdded",
            "ResponseTeam",
            teamId,
            $"Added membership #{request.MembershipId} ({roleInTeam}) to response team '{team.TeamName}'.");

        return await GetTeamByIdAsync(organizationId, teamId);
    }

    public async Task<ResponseTeamDto> RemoveTeamMemberAsync(
        int organizationId,
        int teamId,
        int membershipId,
        int actorUserId)
    {
        var team = await _context.ResponseTeams
            .FirstOrDefaultAsync(t => t.OrganizationId == organizationId && t.ResponseTeamId == teamId)
            ?? throw new KeyNotFoundException($"Response team #{teamId} was not found in this organization.");

        var member = await _context.ResponseTeamMembers
            .FirstOrDefaultAsync(m => m.ResponseTeamId == teamId && m.MembershipId == membershipId)
            ?? throw new KeyNotFoundException("Team member record was not found.");

        _context.ResponseTeamMembers.Remove(member);
        if (team.LeaderMembershipId == membershipId)
        {
            team.LeaderMembershipId = null;
        }
        team.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await LogAuditAsync(
            actorUserId,
            "ResponseTeam.MemberRemoved",
            "ResponseTeam",
            teamId,
            $"Removed membership #{membershipId} from response team '{team.TeamName}'.");

        return await GetTeamByIdAsync(organizationId, teamId);
    }

    public async Task<ResponseTeamDeploymentDto> DeployTeamAsync(
        int organizationId,
        int teamId,
        CreateTeamDeploymentRequest request,
        int actorUserId)
    {
        var team = await _context.ResponseTeams
            .Include(t => t.Members)
            .FirstOrDefaultAsync(t => t.OrganizationId == organizationId && t.ResponseTeamId == teamId)
            ?? throw new KeyNotFoundException($"Response team #{teamId} was not found in this organization.");

        if (team.Status == "Inactive" || team.Status == "Unavailable")
        {
            throw new InvalidOperationException($"Team '{team.TeamName}' is currently '{team.Status}' and cannot be deployed.");
        }

        if (request.CrisisId.HasValue)
        {
            var crisisExists = await _context.CrisisEvents.AnyAsync(c => c.CrisisId == request.CrisisId.Value);
            if (!crisisExists) throw new KeyNotFoundException($"Crisis #{request.CrisisId.Value} was not found.");
        }

        if (request.CitizenRequestId.HasValue)
        {
            var reqExists = await _context.CitizenRequests.AnyAsync(r => r.RequestId == request.CitizenRequestId.Value);
            if (!reqExists) throw new KeyNotFoundException($"Citizen request #{request.CitizenRequestId.Value} was not found.");
        }

        if (request.AreaId.HasValue)
        {
            await EnsureAreaExistsAsync(request.AreaId.Value);
        }

        // Member deployment conflict validation across active deployments
        var teamMembershipIds = team.Members.Select(m => m.MembershipId).ToList();
        if (team.LeaderMembershipId.HasValue && !teamMembershipIds.Contains(team.LeaderMembershipId.Value))
        {
            teamMembershipIds.Add(team.LeaderMembershipId.Value);
        }

        if (teamMembershipIds.Count > 0)
        {
            var conflictingTeam = await _context.ResponseTeamDeployments
                .AsNoTracking()
                .Where(d =>
                    d.Status == "Active" &&
                    d.ResponseTeamId != teamId &&
                    (d.ResponseTeam.Members.Any(m => teamMembershipIds.Contains(m.MembershipId)) ||
                     (d.ResponseTeam.LeaderMembershipId.HasValue && teamMembershipIds.Contains(d.ResponseTeam.LeaderMembershipId.Value))))
                .Select(d => d.ResponseTeam.TeamName)
                .FirstOrDefaultAsync();

            if (!string.IsNullOrEmpty(conflictingTeam))
            {
                throw new InvalidOperationException(
                    $"Deployment conflict: one or more members of '{team.TeamName}' are already actively deployed with '{conflictingTeam}'.");
            }
        }

        var deployment = new ResponseTeamDeployment
        {
            ResponseTeamId = teamId,
            OrganizationId = organizationId,
            CrisisId = request.CrisisId,
            CitizenRequestId = request.CitizenRequestId,
            AreaId = request.AreaId ?? team.AreaId,
            MissionTitle = request.MissionTitle.Trim(),
            Notes = Normalize(request.Notes),
            Status = "Active",
            DeployedAt = DateTime.UtcNow,
            DeployedByUserId = actorUserId,
        };

        _context.ResponseTeamDeployments.Add(deployment);
        team.Status = "Deployed";
        team.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await LogAuditAsync(
            actorUserId,
            "ResponseTeam.Deployed",
            "ResponseTeamDeployment",
            deployment.DeploymentId,
            $"Deployed team '{team.TeamName}' to '{deployment.MissionTitle}'.");

        var saved = await _context.ResponseTeamDeployments
            .AsNoTracking()
            .Include(d => d.ResponseTeam)
            .Include(d => d.Crisis)
            .Include(d => d.Area)
            .FirstAsync(d => d.DeploymentId == deployment.DeploymentId);

        return MapDeploymentToDto(saved);
    }

    public async Task<ResponseTeamDeploymentDto> CompleteDeploymentAsync(
        int organizationId,
        int teamId,
        int deploymentId,
        string status,
        int actorUserId)
    {
        if (status != "Completed" && status != "Cancelled")
        {
            throw new ArgumentException("Deployment completion status must be 'Completed' or 'Cancelled'.");
        }

        var deployment = await _context.ResponseTeamDeployments
            .Include(d => d.ResponseTeam)
            .Include(d => d.Crisis)
            .Include(d => d.Area)
            .FirstOrDefaultAsync(d =>
                d.OrganizationId == organizationId &&
                d.ResponseTeamId == teamId &&
                d.DeploymentId == deploymentId)
            ?? throw new KeyNotFoundException($"Deployment #{deploymentId} was not found for this team.");

        deployment.Status = status;
        deployment.CompletedAt = DateTime.UtcNow;

        var hasOtherActive = await _context.ResponseTeamDeployments
            .AnyAsync(d =>
                d.ResponseTeamId == teamId &&
                d.DeploymentId != deploymentId &&
                d.Status == "Active");

        if (!hasOtherActive)
        {
            deployment.ResponseTeam.Status = "Available";
            deployment.ResponseTeam.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        await LogAuditAsync(
            actorUserId,
            "ResponseTeam.DeploymentClosed",
            "ResponseTeamDeployment",
            deployment.DeploymentId,
            $"Marked deployment #{deployment.DeploymentId} for '{deployment.ResponseTeam.TeamName}' as '{status}'.");

        return MapDeploymentToDto(deployment);
    }

    public async Task<IReadOnlyList<OrganizationAreaDto>> GetAssignedAreasAsync(int organizationId)
    {
        await EnsureOrganizationExistsAsync(organizationId);

        var assigned = await _context.OrganizationAreas
            .AsNoTracking()
            .Where(oa => oa.OrganizationId == organizationId)
            .Include(oa => oa.Area)
                .ThenInclude(a => a.ParentArea)
            .OrderByDescending(oa => oa.AssignedAt)
            .ToListAsync();

        var openStatuses = new[] { "Pending", "Verified", "Assigned" };
        var requestCounts = await _context.CitizenRequests
            .AsNoTracking()
            .Where(r => openStatuses.Contains(r.Status))
            .GroupBy(r => r.AreaId)
            .Select(g => new { AreaId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.AreaId, x => x.Count);

        var teamCounts = await _context.ResponseTeams
            .AsNoTracking()
            .Where(t => t.OrganizationId == organizationId && t.AreaId.HasValue)
            .GroupBy(t => t.AreaId!.Value)
            .Select(g => new { AreaId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.AreaId, x => x.Count);

        var activeCrisesCount = await _context.CrisisEvents
            .AsNoTracking()
            .CountAsync(c => c.Status == "Active" || c.Status == "Reported");

        return assigned.Select(oa => new OrganizationAreaDto
        {
            OrganizationAreaId = oa.OrganizationAreaId,
            OrganizationId = oa.OrganizationId,
            AreaId = oa.AreaId,
            AreaName = oa.Area.AreaName,
            AreaType = oa.Area.AreaType,
            ParentAreaName = oa.Area.ParentArea?.AreaName,
            Code = oa.Area.Code,
            Latitude = oa.Area.Latitude,
            Longitude = oa.Area.Longitude,
            AssignmentStatus = oa.AssignmentStatus,
            PrimaryContact = oa.PrimaryContact,
            Notes = oa.Notes,
            AssignedAt = oa.AssignedAt,
            ActiveCrisesCount = activeCrisesCount,
            OpenRequestsCount = requestCounts.GetValueOrDefault(oa.AreaId, 0),
            AssignedTeamsCount = teamCounts.GetValueOrDefault(oa.AreaId, 0),
        }).ToList();
    }

    public async Task<OrganizationAreaDto> AssignAreaAsync(
        int organizationId,
        AssignOrganizationAreaRequest request,
        int actorUserId)
    {
        await EnsureOrganizationExistsAsync(organizationId);
        await EnsureAreaExistsAsync(request.AreaId);

        var exists = await _context.OrganizationAreas
            .AnyAsync(oa => oa.OrganizationId == organizationId && oa.AreaId == request.AreaId);
        if (exists)
        {
            throw new InvalidOperationException("This geographic area is already assigned to your organization.");
        }

        var assignment = new OrganizationArea
        {
            OrganizationId = organizationId,
            AreaId = request.AreaId,
            AssignmentStatus = request.AssignmentStatus,
            PrimaryContact = Normalize(request.PrimaryContact),
            Notes = Normalize(request.Notes),
            AssignedAt = DateTime.UtcNow,
            AssignedByUserId = actorUserId,
        };

        _context.OrganizationAreas.Add(assignment);
        await _context.SaveChangesAsync();

        await LogAuditAsync(
            actorUserId,
            "OrganizationArea.Assigned",
            "OrganizationArea",
            assignment.OrganizationAreaId,
            $"Assigned area #{request.AreaId} to organization #{organizationId}.");

        var list = await GetAssignedAreasAsync(organizationId);
        return list.First(a => a.OrganizationAreaId == assignment.OrganizationAreaId);
    }

    public async Task<OrganizationAreaDto> UpdateAssignedAreaAsync(
        int organizationId,
        int organizationAreaId,
        UpdateOrganizationAreaRequest request,
        int actorUserId)
    {
        var assignment = await _context.OrganizationAreas
            .FirstOrDefaultAsync(oa => oa.OrganizationId == organizationId && oa.OrganizationAreaId == organizationAreaId)
            ?? throw new KeyNotFoundException($"Assigned area #{organizationAreaId} was not found for this organization.");

        assignment.AssignmentStatus = request.AssignmentStatus;
        assignment.PrimaryContact = Normalize(request.PrimaryContact);
        assignment.Notes = Normalize(request.Notes);
        await _context.SaveChangesAsync();

        await LogAuditAsync(
            actorUserId,
            "OrganizationArea.Updated",
            "OrganizationArea",
            assignment.OrganizationAreaId,
            $"Updated area assignment #{organizationAreaId} status to '{assignment.AssignmentStatus}'.");

        var list = await GetAssignedAreasAsync(organizationId);
        return list.First(a => a.OrganizationAreaId == assignment.OrganizationAreaId);
    }

    public async Task RemoveAssignedAreaAsync(int organizationId, int organizationAreaId, int actorUserId)
    {
        var assignment = await _context.OrganizationAreas
            .FirstOrDefaultAsync(oa => oa.OrganizationId == organizationId && oa.OrganizationAreaId == organizationAreaId)
            ?? throw new KeyNotFoundException($"Assigned area #{organizationAreaId} was not found for this organization.");

        _context.OrganizationAreas.Remove(assignment);
        await _context.SaveChangesAsync();

        await LogAuditAsync(
            actorUserId,
            "OrganizationArea.Removed",
            "OrganizationArea",
            organizationAreaId,
            $"Removed area assignment #{organizationAreaId} from organization #{organizationId}.");
    }

    public async Task<IReadOnlyList<OrganizationAidRequestDto>> GetAidRequestsAsync(int organizationId)
    {
        await EnsureOrganizationExistsAsync(organizationId);

        var assignedAreaIds = await _context.OrganizationAreas
            .AsNoTracking()
            .Where(oa => oa.OrganizationId == organizationId && oa.AssignmentStatus == "Active")
            .Select(oa => oa.AreaId)
            .ToListAsync();

        var activeDeployments = await _context.ResponseTeamDeployments
            .AsNoTracking()
            .Where(d => d.Status == "Active" && d.CitizenRequestId.HasValue)
            .Select(d => new
            {
                d.DeploymentId,
                d.OrganizationId,
                d.ResponseTeamId,
                d.ResponseTeam.TeamName,
                CitizenRequestId = d.CitizenRequestId!.Value,
            })
            .ToListAsync();

        var otherOrgClaimedRequestIds = activeDeployments
            .Where(d => d.OrganizationId != organizationId)
            .Select(d => d.CitizenRequestId)
            .ToHashSet();

        var orgDeploymentByRequestId = activeDeployments
            .Where(d => d.OrganizationId == organizationId)
            .GroupBy(d => d.CitizenRequestId)
            .ToDictionary(g => g.Key, g => g.First());

        var query = _context.CitizenRequests
            .AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.Area)
            .Where(r => !otherOrgClaimedRequestIds.Contains(r.RequestId));

        if (assignedAreaIds.Count > 0)
        {
            var myDeployedRequestIds = orgDeploymentByRequestId.Keys.ToList();
            query = query.Where(r => assignedAreaIds.Contains(r.AreaId) || myDeployedRequestIds.Contains(r.RequestId));
        }

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var crisisIds = items.Where(r => r.CrisisId.HasValue).Select(r => r.CrisisId!.Value).Distinct().ToList();
        var crisisNames = crisisIds.Count > 0
            ? await _context.CrisisEvents
                .AsNoTracking()
                .Where(c => crisisIds.Contains(c.CrisisId))
                .ToDictionaryAsync(c => c.CrisisId, c => c.CrisisName)
            : new Dictionary<int, string>();

        return items.Select(r =>
        {
            orgDeploymentByRequestId.TryGetValue(r.RequestId, out var dep);
            string? crisisName = r.CrisisId.HasValue && crisisNames.TryGetValue(r.CrisisId.Value, out var cn) ? cn : null;
            return new OrganizationAidRequestDto
            {
                RequestId = r.RequestId,
                UserId = r.UserId,
                CitizenName = r.User.FullName,
                CrisisId = r.CrisisId,
                CrisisName = crisisName,
                AreaId = r.AreaId,
                AreaName = r.Area.AreaName,
                RequestType = r.RequestType,
                Description = r.Description,
                UrgencyLevel = r.UrgencyLevel,
                PeopleCount = r.PeopleCount,
                Status = r.Status,
                Address = r.Address,
                Latitude = r.Latitude,
                Longitude = r.Longitude,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                IsInAssignedArea = assignedAreaIds.Contains(r.AreaId),
                AssignedTeamId = dep?.ResponseTeamId,
                AssignedTeamName = dep?.TeamName,
                ActiveDeploymentId = dep?.DeploymentId,
            };
        }).ToList();
    }

    public async Task<OrganizationAidRequestDto> UpdateAidRequestStatusAsync(
        int organizationId,
        int requestId,
        string status,
        int actorUserId)
    {
        await EnsureOrganizationExistsAsync(organizationId);

        var req = await _context.CitizenRequests
            .FirstOrDefaultAsync(r => r.RequestId == requestId)
            ?? throw new KeyNotFoundException($"Citizen request #{requestId} was not found.");

        var claimedByOtherOrg = await _context.ResponseTeamDeployments
            .AnyAsync(d => d.Status == "Active" && d.CitizenRequestId == requestId && d.OrganizationId != organizationId);
        if (claimedByOtherOrg)
        {
            throw new UnauthorizedAccessException("This aid request is currently assigned to another organization.");
        }

        if (!AllowedRequestTransitions.TryGetValue(req.Status, out var allowed) ||
            !allowed.Contains(status, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Cannot transition aid request from '{req.Status}' to '{status}'.");
        }

        req.Status = allowed.First(s => s.Equals(status, StringComparison.OrdinalIgnoreCase));
        req.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await LogAuditAsync(
            actorUserId,
            "OrganizationAidRequest.StatusUpdated",
            "CitizenRequest",
            req.RequestId,
            $"Organization #{organizationId} updated aid request #{req.RequestId} status to '{req.Status}'.");

        var list = await GetAidRequestsAsync(organizationId);
        return list.First(x => x.RequestId == requestId);
    }

    public async Task<OrganizationAidRequestDto> AssignTeamToAidRequestAsync(
        int organizationId,
        int requestId,
        AssignTeamToAidRequestInput request,
        int actorUserId)
    {
        var req = await _context.CitizenRequests
            .Include(r => r.Area)
            .FirstOrDefaultAsync(r => r.RequestId == requestId)
            ?? throw new KeyNotFoundException($"Citizen request #{requestId} was not found.");

        if (req.Status == "Fulfilled" || req.Status == "Rejected")
        {
            throw new InvalidOperationException($"Cannot assign a team to a '{req.Status}' aid request.");
        }

        var claimedByOtherOrg = await _context.ResponseTeamDeployments
            .AnyAsync(d => d.Status == "Active" && d.CitizenRequestId == requestId && d.OrganizationId != organizationId);
        if (claimedByOtherOrg)
        {
            throw new UnauthorizedAccessException("This aid request is already assigned to another organization.");
        }

        await DeployTeamAsync(
            organizationId,
            request.ResponseTeamId,
            new CreateTeamDeploymentRequest
            {
                CrisisId = req.CrisisId,
                CitizenRequestId = req.RequestId,
                AreaId = req.AreaId,
                MissionTitle = $"Aid Request #{req.RequestId}: {req.RequestType} ({req.Area.AreaName})",
                Notes = request.Notes,
            },
            actorUserId);

        if (req.Status == "Pending" || req.Status == "Verified")
        {
            req.Status = "Assigned";
            req.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        var list = await GetAidRequestsAsync(organizationId);
        return list.First(x => x.RequestId == requestId);
    }

    public async Task<OrganizationLogisticsResponse> GetLogisticsAsync(int organizationId)
    {
        await EnsureOrganizationExistsAsync(organizationId);

        var assignedAreaIds = await _context.OrganizationAreas
            .AsNoTracking()
            .Where(oa => oa.OrganizationId == organizationId && oa.AssignmentStatus == "Active")
            .Select(oa => oa.AreaId)
            .ToListAsync();

        var orgMemberUserIds = await _context.OrganizationMemberships
            .AsNoTracking()
            .Where(m => m.OrganizationId == organizationId && m.MembershipStatus == "Approved")
            .Select(m => m.UserId)
            .ToListAsync();

        var warehouses = await _context.Warehouses
            .AsNoTracking()
            .Where(w => w.IsActive)
            .OrderBy(w => w.WarehouseName)
            .Select(w => new OrganizationWarehouseDto
            {
                WarehouseId = w.WarehouseId,
                WarehouseName = w.WarehouseName,
                AreaId = w.AreaId,
                AreaName = w.Area.AreaName,
                Address = w.Address,
                Latitude = w.Latitude,
                Longitude = w.Longitude,
                IsActive = w.IsActive,
            })
            .ToListAsync();

        var inventories = await _context.WarehouseInventories
            .AsNoTracking()
            .Where(i => i.Warehouse.IsActive)
            .OrderBy(i => i.Warehouse.WarehouseName)
            .ThenBy(i => i.Resource.ResourceName)
            .Select(i => new OrganizationInventoryDto
            {
                InventoryId = i.InventoryId,
                WarehouseId = i.WarehouseId,
                WarehouseName = i.Warehouse.WarehouseName,
                ResourceId = i.ResourceId,
                ResourceName = i.Resource.ResourceName,
                UnitOfMeasure = i.Resource.UnitOfMeasure,
                QuantityAvailable = i.QuantityAvailable,
                ReorderLevel = i.ReorderLevel,
            })
            .ToListAsync();

        var allocations = await _context.ResourceAllocations
            .AsNoTracking()
            .Where(a =>
                orgMemberUserIds.Contains(a.RequestedByUserId) ||
                (a.CitizenRequest != null && assignedAreaIds.Contains(a.CitizenRequest.AreaId)))
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new OrganizationAllocationDto
            {
                AllocationId = a.AllocationId,
                InventoryId = a.InventoryId,
                WarehouseName = a.Inventory.Warehouse.WarehouseName,
                ResourceId = a.Inventory.ResourceId,
                ResourceName = a.Inventory.Resource.ResourceName,
                CrisisId = a.CrisisId,
                CrisisName = a.Crisis.CrisisName,
                CitizenRequestId = a.CitizenRequestId,
                QuantityRequested = a.QuantityRequested,
                QuantityAllocated = a.QuantityAllocated,
                Status = a.Status.ToString(),
                RequestedByUserName = a.RequestedByUser.FullName,
                ApprovedByUserName = a.ApprovedByUser != null ? a.ApprovedByUser.FullName : null,
                ReferenceNumber = a.ReferenceNumber,
                CreatedAt = a.CreatedAt,
            })
            .ToListAsync();

        return new OrganizationLogisticsResponse
        {
            Warehouses = warehouses,
            Inventories = inventories,
            Allocations = allocations,
        };
    }

    private async Task EnsureOrganizationExistsAsync(int organizationId)
    {
        var exists = await _context.Organizations.AnyAsync(o => o.OrganizationId == organizationId);
        if (!exists)
        {
            throw new KeyNotFoundException($"Organization with ID {organizationId} was not found.");
        }
    }

    private async Task EnsureApprovedOrgMembershipAsync(int organizationId, int membershipId)
    {
        var membership = await _context.OrganizationMemberships
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.MembershipId == membershipId && m.OrganizationId == organizationId);

        if (membership == null)
        {
            throw new InvalidOperationException("The selected member does not belong to this organization.");
        }

        if (membership.MembershipStatus != "Approved")
        {
            throw new InvalidOperationException("Only approved organization members can be assigned to a response team.");
        }
    }

    private async Task EnsureAreaExistsAsync(int areaId)
    {
        var exists = await _context.Areas.AnyAsync(a => a.AreaId == areaId);
        if (!exists)
        {
            throw new KeyNotFoundException($"Geographic area #{areaId} was not found.");
        }
    }

    private Task LogAuditAsync(
        int actorUserId,
        string action,
        string entityType,
        int entityId,
        string summary)
    {
        return _auditLogService.RecordAsync(
            actorUserId,
            null,
            action,
            entityType,
            entityId.ToString(),
            summary);
    }

    private static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ResponseTeamDeploymentDto MapDeploymentToDto(ResponseTeamDeployment d) => new()
    {
        DeploymentId = d.DeploymentId,
        ResponseTeamId = d.ResponseTeamId,
        TeamName = d.ResponseTeam?.TeamName ?? string.Empty,
        CrisisId = d.CrisisId,
        CrisisName = d.Crisis?.CrisisName,
        CitizenRequestId = d.CitizenRequestId,
        AreaId = d.AreaId,
        AreaName = d.Area?.AreaName,
        MissionTitle = d.MissionTitle,
        Notes = d.Notes,
        Status = d.Status,
        DeployedAt = d.DeployedAt,
        CompletedAt = d.CompletedAt,
    };

    private static ResponseTeamDto MapTeamToDto(ResponseTeam t)
    {
        var deployments = t.Deployments
            .OrderByDescending(d => d.DeployedAt)
            .Select(MapDeploymentToDto)
            .ToList();

        var members = t.Members
            .OrderBy(m => m.RoleInTeam == "Leader" ? 0 : 1)
            .ThenBy(m => m.Membership.User.FullName)
            .Select(m => new ResponseTeamMemberDto
            {
                ResponseTeamMemberId = m.ResponseTeamMemberId,
                MembershipId = m.MembershipId,
                UserId = m.Membership.UserId,
                FullName = m.Membership.User.FullName,
                Email = m.Membership.User.Email,
                RoleInTeam = m.RoleInTeam,
                JoinedAt = m.JoinedAt,
            })
            .ToList();

        return new ResponseTeamDto
        {
            ResponseTeamId = t.ResponseTeamId,
            OrganizationId = t.OrganizationId,
            TeamName = t.TeamName,
            TeamType = t.TeamType,
            LeaderMembershipId = t.LeaderMembershipId,
            LeaderName = t.LeaderMembership?.User.FullName,
            LeaderEmail = t.LeaderMembership?.User.Email,
            AreaId = t.AreaId,
            AreaName = t.Area?.AreaName,
            BaseStation = t.BaseStation,
            ContactPhone = t.ContactPhone,
            ContactEmail = t.ContactEmail,
            SpecializedEquipment = t.SpecializedEquipment,
            Status = t.Status,
            MembersCount = members.Count,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt,
            ActiveDeployment = deployments.FirstOrDefault(d => d.Status == "Active"),
            Members = members,
            Deployments = deployments,
        };
    }
}
