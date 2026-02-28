using Microsoft.AspNetCore.Http;
using RagProject.Data;

namespace RagProject.Services
{
    public interface IChatService
    {
        Task<ChatSession> CreateSessionAsync(int userId, string title);
        Task<StudyDocument> UploadAndLinkDocumentAsync(int sessionId, IFormFile file, int userId);
        Task<string> AskQuestionAsync(int sessionId, string message);
    }
}
