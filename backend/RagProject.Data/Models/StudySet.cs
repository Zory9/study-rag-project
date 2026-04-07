using System.ComponentModel.DataAnnotations;

namespace RagProject.Data
{
    // A single generation result representing either a flashcard deck or a test, scoped to a ChatSession.
    public class StudySet : BaseModel
    {
        [Required]
        public StudySetKind Kind { get; set; }

        [Required]
        public int ChatSessionId { get; set; }
        public ChatSession? ChatSession { get; set; }

        // For test sets - true once the student has gone past the last question
        public bool IsFinished { get; set; }

        // Navigation to the generated items
        public ICollection<Flashcard> Flashcards { get; set; } = new List<Flashcard>();
        public ICollection<TestQuestion> TestQuestions { get; set; } = new List<TestQuestion>();
        public ICollection<TestQuestionAttempt> Attempts { get; set; } = new List<TestQuestionAttempt>();

        // Sources retrieved for this generation
        public ICollection<StudySetSource> Sources { get; set; } = new List<StudySetSource>();
    }
}
