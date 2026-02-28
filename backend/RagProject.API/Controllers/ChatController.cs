using Microsoft.AspNetCore.Mvc;
using RagProject.Data;
using RagProject.Services;

namespace RagProject.API
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController(IChatService chatService) : ControllerBase
    {
        [HttpPost("chat-session")]
        public async Task<ActionResult<ChatSession>> CreateSession([FromBody] CreateSessionRequest request)
        {
            var session = await chatService.CreateSessionAsync(request.UserId, request.Title);
            return Ok(session);
        }

        [HttpPost("chat-session/{sessionId}/upload")]
        public async Task<ActionResult<StudyDocument>> UploadToSession(int sessionId, IFormFile file, [FromQuery] int userId)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file provided.");

            try
            {
                var doc = await chatService.UploadAndLinkDocumentAsync(sessionId, file, userId);
                return Ok(doc);
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, $"RAG Service unavailable: {ex.Message}");
            }
        }

        [HttpPost("chat-session/{sessionId}/ask")]
        public async Task<ActionResult<string>> AskQuestion(int sessionId, [FromBody] QuestionRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest("Message cannot be empty.");

            var answer = await chatService.AskQuestionAsync(sessionId, request.Message);
            return Ok(new { answer });
        }
    }
}