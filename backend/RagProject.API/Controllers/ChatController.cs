using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RagProject.Data;
using RagProject.Services;

namespace RagProject.API
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController(IChatService chatService, IUserRepository userRepository) : ControllerBase
    {
        [HttpGet("chat-sessions")]
        public async Task<ActionResult<List<ChatSessionDTO>>> GetSessions()
        {
            var currentUser = await userRepository.GetCurrentUserAsync();
            var sessions = await chatService.GetSessionsAsync(currentUser.Id);
            return Ok(sessions);
        }

        [HttpGet("chat-session/{sessionId}")]
        public async Task<ActionResult<ChatSessionDetailDTO>> GetSessionDetail(int sessionId)
        {
            var currentUser = await userRepository.GetCurrentUserAsync();
            try
            {
                var detail = await chatService.GetSessionDetailAsync(sessionId, currentUser.Id);
                return Ok(detail);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpPost("chat-session")]
        public async Task<ActionResult<ChatSessionDTO>> CreateSession([FromBody] CreateSessionRequest request)
        {
            var currentUser = await userRepository.GetCurrentUserAsync();
            var session = await chatService.CreateSessionAsync(currentUser.Id, request.Title);
            return Ok(session);
        }

        [HttpPost("chat-session/{sessionId}/upload")]
        public async Task<ActionResult<StudyDocumentDTO>> UploadToSession(int sessionId, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file provided.");

            var currentUser = await userRepository.GetCurrentUserAsync();
            try
            {
                var doc = await chatService.UploadAndLinkDocumentAsync(sessionId, file, currentUser.Id);
                return Ok(doc);
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, $"RAG Service unavailable: {ex.Message}");
            }
        }

        [HttpPost("chat-session/{sessionId}/ask")]
        public async Task<ActionResult<ChatMessageDTO>> AskQuestion(int sessionId, [FromBody] QuestionRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest("Message cannot be empty.");

            var currentUser = await userRepository.GetCurrentUserAsync();
            var answer = await chatService.AskQuestionAsync(sessionId, request.Message, currentUser.Id);
            return Ok(answer);
        }
    }
}