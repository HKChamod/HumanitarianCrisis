using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HumanitarianCrisisManagement.Domain.Entities
{
    public class UserRole
    {
        [Key]
        public int UserRoleId { get; set; }

        public int UserId { get; set; }

        public int RoleId { get; set; }

        // Navigation properties
        public User User { get; set; } = null!;

        public Role Role { get; set; } = null!;
    }
}
