using Microsoft.AspNetCore.Http;
using RagProject.Data;

namespace RagProject.Services
{
    public interface IChatService
    {
        Task<ChatSessionDTO> CreateSessionAsync(int userId, string title);
        Task<List<ChatSessionDTO>> GetSessionsAsync(int userId);
        Task<ChatSessionDetailDTO> GetSessionDetailAsync(int sessionId, int userId);
        Task DeleteSessionAsync(int sessionId, int userId);
        Task<StudyDocumentDTO> UploadAndLinkDocumentAsync(int sessionId, IFormFile file, int userId);
        Task<ChatMessageDTO> AskQuestionAsync(int sessionId, string message, int userId);
        Task<FlashcardSetDTO> GenerateFlashcardsAsync(int sessionId, int userId, int count);
        Task<TestSetDTO> GenerateTestAsync(int sessionId, int userId, int count);
        Task<EvaluateDTO> EvaluateAnswerAsync(int sessionId, int userId, EvaluateRequest request);
    }
}
