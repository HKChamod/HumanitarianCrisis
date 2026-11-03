using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HumanitarianCrisisManagement.Domain.Entities
{
    public class Role
    {
        [Key]
        public int RoleId { get; set; }

        public string RoleName { get; set; } = string.Empty;

        // Navigation property
        public ICollection<UserRole> UserRoles { get; set; }
            = new List<UserRole>();
    }
}
