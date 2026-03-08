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
                        Sources = MapMessageSources(m.Sources)
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

        public async Task DeleteSessionAsync(int sessionId, int userId)
        {
            var session = await _dataContext.ChatSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId)
                ?? throw new KeyNotFoundException("Session not found.");

            _dataContext.ChatSessions.Remove(session);
            await _dataContext.SaveChangesAsync();
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
                Sources = MapAiSourcesToMessageEntities(aiData?.Sources)
            };

            _dataContext.ChatMessages.Add(userMessage);
            _dataContext.ChatMessages.Add(assistantMessage);
            await _dataContext.SaveChangesAsync();

            return new ChatMessageDTO
            {
                Role = assistantMessage.Role,
                Content = assistantMessage.Content,
                DateCreated = assistantMessage.DateCreated,
                Sources = MapMessageSources(assistantMessage.Sources)
            };
        }

        public async Task<FlashcardSetDTO> GenerateFlashcardsAsync(int sessionId, int userId, int count)
        {
            await VerifySessionOwnershipAsync(sessionId, userId);

            var ragResponse = await httpClient.PostAsJsonAsync("flashcards", new { sessionId, count });
            ragResponse.EnsureSuccessStatusCode();

            var ragData = await ragResponse.Content.ReadFromJsonAsync<RagFlashcardSetResponse>()
                ?? new RagFlashcardSetResponse(new List<RagFlashcard>(), new List<AiSource>());

            var studySet = new StudySet
            {
                Kind = StudySetKind.Flashcard,
                ChatSessionId = sessionId,
                DateCreated = DateTime.UtcNow,
                Flashcards = ragData.Flashcards.Select(f => new Flashcard
                {
                    Front = f.Front,
                    Back = f.Back,
                    DateCreated = DateTime.UtcNow
                }).ToList(),
                Sources = MapAiSourcesToEntities(ragData.Sources)
            };

            _dataContext.StudySets.Add(studySet);
            await _dataContext.SaveChangesAsync();

            return new FlashcardSetDTO
            {
                StudySetId = studySet.Id,
                DateCreated = studySet.DateCreated,
                Flashcards = studySet.Flashcards.Select(f => new FlashcardDTO
                {
                    Id = f.Id,
                    Front = f.Front,
                    Back = f.Back
                }).ToList(),
                Sources = MapSources(studySet.Sources)
            };
        }

        public async Task<TestSetDTO> GenerateTestAsync(int sessionId, int userId, int count)
        {
            await VerifySessionOwnershipAsync(sessionId, userId);

            var ragResponse = await httpClient.PostAsJsonAsync("test", new { sessionId, count });
            ragResponse.EnsureSuccessStatusCode();

            var ragData = await ragResponse.Content.ReadFromJsonAsync<RagTestSetResponse>()
                ?? new RagTestSetResponse(new List<RagTestQuestion>(), new List<AiSource>());

            var studySet = new StudySet
            {
                Kind = StudySetKind.Test,
                ChatSessionId = sessionId,
                DateCreated = DateTime.UtcNow,
                TestQuestions = ragData.Questions.Select(q => new TestQuestion
                {
                    Kind = q.Kind == "mcq" ? TestQuestionKind.Mcq : TestQuestionKind.Open,
                    Question = q.Question,
                    CorrectLabel = q.CorrectLabel,
                    Explanation = q.Explanation,
                    SampleAnswer = q.SampleAnswer,
                    DateCreated = DateTime.UtcNow,
                    Options = q.Options?.Select(o => new McqOption
                    {
                        Label = o.Label,
                        Text = o.Text,
                        DateCreated = DateTime.UtcNow
                    }).ToList() ?? new List<McqOption>()
                }).ToList(),
                Sources = MapAiSourcesToEntities(ragData.Sources)
            };

            _dataContext.StudySets.Add(studySet);
            await _dataContext.SaveChangesAsync();

            return new TestSetDTO
            {
                StudySetId = studySet.Id,
                DateCreated = studySet.DateCreated,
                Questions = studySet.TestQuestions.Select(q => new TestQuestionDTO
                {
                    Id = q.Id,
                    Kind = q.Kind == TestQuestionKind.Mcq ? "mcq" : "open",
                    Question = q.Question,
                    CorrectLabel = q.CorrectLabel,
                    Explanation = q.Explanation,
                    SampleAnswer = q.SampleAnswer,
                    Options = q.Options.Select(o => new McqOptionDTO
                    {
                        Label = o.Label,
                        Text = o.Text
                    }).ToList()
                }).ToList(),
                Sources = MapSources(studySet.Sources)
            };
        }

        public async Task<EvaluateDTO> EvaluateAnswerAsync(int sessionId, int userId, EvaluateRequest request)
        {
            await VerifySessionOwnershipAsync(sessionId, userId);

            var question = await _dataContext.TestQuestions
                .FirstOrDefaultAsync(q =>
                    q.Id == request.QuestionId &&
                    q.StudySetId == request.StudySetId &&
                    q.StudySet!.ChatSessionId == sessionId)
                ?? throw new KeyNotFoundException("Question not found.");

            if (question.Kind != TestQuestionKind.Open || question.SampleAnswer == null)
                throw new InvalidOperationException("Only open questions can be evaluated.");

            var ragResponse = await httpClient.PostAsJsonAsync("evaluate", new
            {
                question = question.Question,
                sampleAnswer = question.SampleAnswer,
                studentAnswer = request.StudentAnswer
            });
            ragResponse.EnsureSuccessStatusCode();

            var ragData = await ragResponse.Content.ReadFromJsonAsync<RagEvaluateResponse>()
                ?? new RagEvaluateResponse(0, "Could not evaluate.", false);

            return new EvaluateDTO
            {
                Score = ragData.Score,
                Feedback = ragData.Feedback,
                IsCorrect = ragData.IsCorrect
            };
        }

        private static List<MessageSource> MapAiSourcesToMessageEntities(IEnumerable<AiSource>? sources) =>
            sources?.Select(s => new MessageSource
            {
                FileName = s.FileName,
                Page = s.Page,
                LineFrom = s.LineFrom,
                LineTo = s.LineTo,
                Snippet = s.Snippet
            }).ToList() ?? new List<MessageSource>();

        private static List<MessageSourceDTO> MapMessageSources(IEnumerable<MessageSource> sources) =>
            sources.Select(s => new MessageSourceDTO
            {
                FileName = s.FileName,
                Page = s.Page,
                LineFrom = s.LineFrom,
                LineTo = s.LineTo,
                Snippet = s.Snippet
            }).ToList();

        private static List<StudySetSource> MapAiSourcesToEntities(IEnumerable<AiSource> sources) =>
            sources.Select(s => new StudySetSource
            {
                FileName = s.FileName,
                Page = s.Page,
                LineFrom = s.LineFrom,
                LineTo = s.LineTo,
                Snippet = s.Snippet,
                DateCreated = DateTime.UtcNow
            }).ToList();

        private static List<StudySetSourceDTO> MapSources(IEnumerable<StudySetSource> sources) =>
            sources.Select(s => new StudySetSourceDTO
            {
                FileName = s.FileName,
                Page = s.Page,
                LineFrom = s.LineFrom,
                LineTo = s.LineTo,
                Snippet = s.Snippet
            }).ToList();
    }
}
