using System.ComponentModel.DataAnnotations;

namespace RagProject.Data
{
    public class TestQuestionAttempt : BaseModel
    {
        [Required]
        public int StudySetId { get; set; }
        public StudySet? StudySet { get; set; }

        [Required]
        public int TestQuestionId { get; set; }
        public TestQuestion? TestQuestion { get; set; }

        // MCQ - the label the student selected (null for open questions)
        [MaxLength(10)]
        public string? SelectedLabel { get; set; }

        // Open - the student's text answer (null for MCQ)
        [MaxLength(4000)]
        public string? StudentAnswer { get; set; }

        // Evaluation results (both MCQ and open)
        public bool IsCorrect { get; set; }
        public int Score { get; set; }

        [MaxLength(2000)]
        public string? Feedback { get; set; }
    }
}
