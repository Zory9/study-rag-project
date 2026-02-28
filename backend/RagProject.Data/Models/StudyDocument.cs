using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RagProject.Data
{
    public class StudyDocument : BaseModel
    {
        [Required]
        public string FileName { get; set; } = string.Empty;

        [Required]
        public string ShortName { get; set; } = string.Empty;

        public string? FileSummary { get; set; }

        [Required]
        public int UserId { get; set; }
        public User? User { get; set; }
    }
}