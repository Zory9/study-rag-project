using System.ComponentModel.DataAnnotations;

namespace RagProject.Data
{
    public class McqOption : BaseModel
    {
        [Required, MaxLength(10)]
        public string Label { get; set; } = string.Empty; // "A", "B", "C", "D"

        [Required, MaxLength(1000)]
        public string Text { get; set; } = string.Empty;

        [Required]
        public int TestQuestionId { get; set; }
        public TestQuestion? TestQuestion { get; set; }
    }
}
