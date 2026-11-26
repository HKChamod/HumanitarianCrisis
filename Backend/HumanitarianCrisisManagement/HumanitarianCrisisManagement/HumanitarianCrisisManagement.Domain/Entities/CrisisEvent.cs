using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Domain.Entities
{
    public class CrisisEvent
    {
        [Key]
        public int CrisisId { get; set; }

        public string CrisisName { get; set; } = string.Empty;

        public string CrisisType { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string SeverityLevel { get; set; } = string.Empty;

        public DateTime StartDate { get; set; }

        public string Status { get; set; } = "Active";

        public string? LocationName { get; set; }

        public decimal? Latitude { get; set; }

        public decimal? Longitude { get; set; }

        public ICollection<CitizenRequest> CitizenRequests { get; set; }
            = new List<CitizenRequest>();
    }
}
