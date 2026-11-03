using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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
    }
}
