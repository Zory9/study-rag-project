using System.ComponentModel.DataAnnotations;

namespace RagProject.Data
{
    public class Flashcard : BaseModel
    {
        [Required, MaxLength(1000)]
        public string Front { get; set; } = string.Empty;

        [Required, MaxLength(2000)]
        public string Back { get; set; } = string.Empty;

        [Required]
        public int StudySetId { get; set; }
        public StudySet? StudySet { get; set; }
    }
}
