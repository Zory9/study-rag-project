namespace RagProject.Data
{
    public class StudySetSourceDTO
    {
        public string FileName { get; set; } = string.Empty;
        public int? Page { get; set; }
        public int? LineFrom { get; set; }
        public int? LineTo { get; set; }
        public string? Snippet { get; set; }
    }

    public class FlashcardDTO
    {
        public int Id { get; set; }
        public string Front { get; set; } = string.Empty;
        public string Back { get; set; } = string.Empty;
    }

    public class FlashcardSetDTO
    {
        public int StudySetId { get; set; }
        public DateTime DateCreated { get; set; }
        public List<FlashcardDTO> Flashcards { get; set; } = new();
        public List<StudySetSourceDTO> Sources { get; set; } = new();
    }

    public class McqOptionDTO
    {
        public string Label { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
    }

    public class TestQuestionDTO
    {
        public int Id { get; set; }
        public string Kind { get; set; } = string.Empty; // "mcq" or "open"
        public string Question { get; set; } = string.Empty;

        // MCQ only
        public List<McqOptionDTO>? Options { get; set; }
        public string? CorrectLabel { get; set; }
        public string? Explanation { get; set; }

        // Open only
        public string? SampleAnswer { get; set; }
    }

    public class TestSetDTO
    {
        public int StudySetId { get; set; }
        public DateTime DateCreated { get; set; }
        public List<TestQuestionDTO> Questions { get; set; } = new();
        public List<StudySetSourceDTO> Sources { get; set; } = new();
    }

    public class EvaluateDTO
    {
        public int Score { get; set; }
        public string Feedback { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
    }
}
