using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RagProject.Data;
using System.Net.Http.Json;

namespace RagProject.Services
{
    public class ChatService(DataContext dataContext, IStorageService storageService, HttpClient httpClient) : IChatService
    {
        private readonly DataContext _dataContext = dataContext;
        public async Task<ChatSession> CreateSessionAsync(int userId, string title)
        {
            var session = new ChatSession { UserId = userId, Title = title, DateCreated = DateTime.UtcNow };
            _dataContext.ChatSessions.Add(session);
            await _dataContext.SaveChangesAsync();
            return session;
        }

        public async Task<StudyDocument> UploadAndLinkDocumentAsync(int sessionId, IFormFile file, int userId)
        {
            using var transaction = await _dataContext.Database.BeginTransactionAsync();
            try
            {
                var storageKey = await storageService.SaveFileAsync(file);

                var doc = new StudyDocument
                {
                    UserId = userId,
                    FileName = file.FileName,
                    ShortName = storageKey,
                    DateCreated = DateTime.UtcNow
                };
                _dataContext.StudyDocuments.Add(doc);

                _dataContext.SessionDocuments.Add(new SessionDocument
                {
                    ChatSessionId = sessionId,
                    StudyDocumentId = doc.Id
                });

                await _dataContext.SaveChangesAsync();

                var payload = new
                {
                    sessionId = sessionId,
                    filePath = storageService.GetPhysicalPath(storageKey),
                    fileName = file.FileName
                };

                var response = await httpClient.PostAsJsonAsync("ingest", payload);
                response.EnsureSuccessStatusCode();

                await transaction.CommitAsync();
                return doc;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<ChatMessageDTO> AskQuestionAsync(int sessionId, string message)
        {
            _dataContext.ChatMessages.Add(new ChatMessage
            {
                ChatSessionId = sessionId,
                Content = message,
                Role = MessageRole.User
            });

            var response = await httpClient.PostAsJsonAsync("chat", new
            {
                sessionId,
                query = message
            });

            var aiData = await response.Content.ReadFromJsonAsync<AiResponse>();

            var dbMessage = new ChatMessage
            {
                ChatSessionId = sessionId,
                Content = aiData?.Answer ?? "Sorry, I couldn't process that.",
                Role = MessageRole.Assistant,
                SourceMetadata = aiData?.Sources != null ? string.Join(", ", aiData.Sources) : null,
                DateCreated = DateTime.UtcNow
            };

            _dataContext.ChatMessages.Add(dbMessage);

            await _dataContext.SaveChangesAsync();
            return new ChatMessageDTO
            {
                Role = dbMessage.Role,
                Content = dbMessage.Content,
                DateCreated = dbMessage.DateCreated,
                Sources = aiData?.Sources ?? new List<string>()
            };
        }
    }
}
