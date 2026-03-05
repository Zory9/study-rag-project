using System.ComponentModel.DataAnnotations;

namespace RagProject.Data
{
    public class TestQuestion : BaseModel
    {
        [Required]
        public TestQuestionKind Kind { get; set; }

        [Required, MaxLength(2000)]
        public string Question { get; set; } = string.Empty;

        // MCQ only
        [MaxLength(10)]
        public string? CorrectLabel { get; set; }

        [MaxLength(1000)]
        public string? Explanation { get; set; }

        // Open only
        [MaxLength(2000)]
        public string? SampleAnswer { get; set; }

        [Required]
        public int StudySetId { get; set; }
        public StudySet? StudySet { get; set; }

        // MCQ options in a child table
        public ICollection<McqOption> Options { get; set; } = new List<McqOption>();
    }
}
