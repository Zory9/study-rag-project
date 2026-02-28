namespace RagProject.Data
{
    public record CreateSessionRequest(int UserId, string Title);
    public record QuestionRequest(string Message);
    public record AiResponse(string Answer, List<string> Sources);
}