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
        public async Task<ChatSessionDTO> CreateSessionAsync(int userId, string title)
        {
            var session = new ChatSession { UserId = userId, Title = title, DateCreated = DateTime.UtcNow };
            _dataContext.ChatSessions.Add(session);
            await _dataContext.SaveChangesAsync();
            return new ChatSessionDTO
            {
                Id = session.Id,
                Title = session.Title,
                DateCreated = session.DateCreated
            };
        }

        public async Task<List<ChatSessionDTO>> GetSessionsAsync(int userId)
        {
            return await _dataContext.ChatSessions
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.DateCreated)
                .Select(s => new ChatSessionDTO
                {
                    Id = s.Id,
                    Title = s.Title,
                    DateCreated = s.DateCreated
                })
                .ToListAsync();
        }

        public async Task<ChatSessionDetailDTO> GetSessionDetailAsync(int sessionId, int userId)
        {
            var session = await _dataContext.ChatSessions
                .Include(s => s.Messages)
                    .ThenInclude(m => m.Sources)
                .Include(s => s.SessionDocuments)
                    .ThenInclude(sd => sd.StudyDocument)
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId)
                ?? throw new KeyNotFoundException("Session not found.");

            return new ChatSessionDetailDTO
            {
                Id = session.Id,
                Title = session.Title,
                Messages = session.Messages
                    .OrderBy(m => m.DateCreated)
                    .Select(m => new ChatMessageDTO
                    {
                        Role = m.Role,
                        Content = m.Content,
                        DateCreated = m.DateCreated,
                        Sources = m.Sources.Select(s => new MessageSourceDTO
                        {
                            FileName = s.FileName,
                            Page = s.Page,
                            LineFrom = s.LineFrom,
                            LineTo = s.LineTo,
                            Snippet = s.Snippet
                        }).ToList()
                    }).ToList(),
                AttachedDocuments = session.SessionDocuments
                    .Where(sd => sd.StudyDocument != null)
                    .Select(sd => new StudyDocumentDTO
                    {
                        Id = sd.StudyDocument!.Id,
                        FileName = sd.StudyDocument.FileName,
                        FileSummary = sd.StudyDocument.FileSummary,
                        DateCreated = sd.StudyDocument.DateCreated
                    }).ToList()
            };
        }

        public async Task<StudyDocumentDTO> UploadAndLinkDocumentAsync(int sessionId, IFormFile file, int userId)
        {
            await VerifySessionOwnershipAsync(sessionId, userId);
            string? storageKey = null;
            using var transaction = await _dataContext.Database.BeginTransactionAsync();
            try
            {
                storageKey = await storageService.SaveFileAsync(file);

                var doc = new StudyDocument
                {
                    UserId = userId,
                    FileName = file.FileName,
                    StorageKey = storageKey,
                    DateCreated = DateTime.UtcNow
                };
                _dataContext.StudyDocuments.Add(doc);

                await _dataContext.SaveChangesAsync();

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
                    fileName = file.FileName,
                    storageKey = storageKey
                };

                var response = await httpClient.PostAsJsonAsync("ingest", payload);
                response.EnsureSuccessStatusCode();

                var ingestData = await response.Content.ReadFromJsonAsync<IngestResponse>();
                doc.FileSummary = ingestData?.Summary;
                await _dataContext.SaveChangesAsync();

                await transaction.CommitAsync();
                return new StudyDocumentDTO
                {
                    Id = doc.Id,
                    FileName = doc.FileName,
                    FileSummary = doc.FileSummary,
                    DateCreated = doc.DateCreated
                };
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                if (storageKey != null) await storageService.DeleteFileAsync(storageKey);
                throw;
            }
        }

        private async Task VerifySessionOwnershipAsync(int sessionId, int userId)
        {
            bool owned = await _dataContext.ChatSessions
                .AnyAsync(s => s.Id == sessionId && s.UserId == userId);
            if (!owned) throw new UnauthorizedAccessException("Session not found or access denied.");
        }

        public async Task<ChatMessageDTO> AskQuestionAsync(int sessionId, string message, int userId)
        {
            await VerifySessionOwnershipAsync(sessionId, userId);

            // Load the existing conversation so the RAG service can rewrite the query
            // for multi-turn context awareness.
            var priorMessages = await _dataContext.ChatMessages
                .Where(m => m.ChatSessionId == sessionId)
                .OrderBy(m => m.DateCreated)
                .Select(m => new { role = (int)m.Role, content = m.Content })
                .ToListAsync();

            var response = await httpClient.PostAsJsonAsync("chat", new
            {
                sessionId,
                query = message,
                chatHistory = priorMessages
            });
            response.EnsureSuccessStatusCode();

            var aiData = await response.Content.ReadFromJsonAsync<AiResponse>();

            var userMessage = new ChatMessage
            {
                ChatSessionId = sessionId,
                Content = message,
                Role = MessageRole.User,
                DateCreated = DateTime.UtcNow
            };

            var assistantMessage = new ChatMessage
            {
                ChatSessionId = sessionId,
                Content = aiData?.Answer ?? "Sorry, I couldn't process that.",
                Role = MessageRole.Assistant,
                DateCreated = DateTime.UtcNow,
                Sources = aiData?.Sources?.Select(s => new MessageSource
                {
                    FileName = s.FileName,
                    Page = s.Page,
                    LineFrom = s.LineFrom,
                    LineTo = s.LineTo,
                    Snippet = s.Snippet
                }).ToList() ?? new List<MessageSource>()
            };

            _dataContext.ChatMessages.Add(userMessage);
            _dataContext.ChatMessages.Add(assistantMessage);
            await _dataContext.SaveChangesAsync();

            return new ChatMessageDTO
            {
                Role = assistantMessage.Role,
                Content = assistantMessage.Content,
                DateCreated = assistantMessage.DateCreated,
                Sources = assistantMessage.Sources.Select(s => new MessageSourceDTO
                {
                    FileName = s.FileName,
                    Page = s.Page,
                    LineFrom = s.LineFrom,
                    LineTo = s.LineTo,
                    Snippet = s.Snippet
                }).ToList()
            };
        }
    }
}
