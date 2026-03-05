namespace RagProject.Data
{
    public record CreateSessionRequest(string Title);
    public record QuestionRequest(string Message);
    public record EvaluateRequest(int StudySetId, int QuestionId, string StudentAnswer);
    public record AiResponse(string Answer, List<AiSource> Sources);
    public record AiSource(string FileName, int? Page, int? LineFrom, int? LineTo, string? Snippet);
    public record IngestResponse(string Summary);
    public record RagFlashcard(string Front, string Back);
    public record RagFlashcardSetResponse(List<RagFlashcard> Flashcards, List<AiSource> Sources);
    public record RagMcqOption(string Label, string Text);
    public record RagTestQuestion(
        string Kind,
        string Question,
        List<RagMcqOption>? Options,
        string? CorrectLabel,
        string? Explanation,
        string? SampleAnswer);
    public record RagTestSetResponse(List<RagTestQuestion> Questions, List<AiSource> Sources);
    public record RagEvaluateResponse(int Score, string Feedback, bool IsCorrect);
}