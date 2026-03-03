namespace RagProject.Data
{
    public record CreateSessionRequest(string Title);
    public record QuestionRequest(string Message);
    public record AiResponse(string Answer, List<AiSource> Sources);
    public record AiSource(string FileName, int? Page, int? LineFrom, int? LineTo, string? Snippet);
    public record IngestResponse(string Summary);
}