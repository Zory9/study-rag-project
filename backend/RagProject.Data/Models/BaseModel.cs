using System.ComponentModel.DataAnnotations;

namespace RagProject.Data
{
    public class BaseModel
    {
        [Key]
        [Required]
        public int Id { get; set; }

        [Required]
        public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    }
}
