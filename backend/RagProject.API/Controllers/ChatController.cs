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

        [HttpDelete("chat-session/{sessionId}")]
        public async Task<IActionResult> DeleteSession(int sessionId)
        {
            var currentUser = await userRepository.GetCurrentUserAsync();
            try
            {
                await chatService.DeleteSessionAsync(sessionId, currentUser.Id);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
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

        [HttpPost("chat-session/{sessionId}/flashcards")]
        public async Task<ActionResult<FlashcardSetDTO>> GenerateFlashcards(
            int sessionId,
            [FromQuery] int count = 10)
        {
            var currentUser = await userRepository.GetCurrentUserAsync();
            try
            {
                var result = await chatService.GenerateFlashcardsAsync(sessionId, currentUser.Id, count);
                return Ok(result);
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, $"RAG Service unavailable: {ex.Message}");
            }
        }

        [HttpPost("chat-session/{sessionId}/test")]
        public async Task<ActionResult<TestSetDTO>> GenerateTest(
            int sessionId,
            [FromQuery] int count = 10)
        {
            var currentUser = await userRepository.GetCurrentUserAsync();
            try
            {
                var result = await chatService.GenerateTestAsync(sessionId, currentUser.Id, count);
                return Ok(result);
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, $"RAG Service unavailable: {ex.Message}");
            }
        }

        [HttpPost("chat-session/{sessionId}/evaluate")]
        public async Task<ActionResult<EvaluateDTO>> EvaluateAnswer(
            int sessionId,
            [FromBody] EvaluateRequest request)
        {
            var currentUser = await userRepository.GetCurrentUserAsync();
            try
            {
                var result = await chatService.EvaluateAnswerAsync(sessionId, currentUser.Id, request);
                return Ok(result);
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, $"RAG Service unavailable: {ex.Message}");
            }
        }

        [HttpGet("chat-session/{sessionId}/study-sets")]
        public async Task<ActionResult<SessionStudySetsDTO>> GetStudySets(int sessionId)
        {
            var currentUser = await userRepository.GetCurrentUserAsync();
            try
            {
                var result = await chatService.GetStudySetsAsync(sessionId, currentUser.Id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpDelete("chat-session/{sessionId}/study-set/{studySetId}")]
        public async Task<IActionResult> DeleteStudySet(int sessionId, int studySetId)
        {
            var currentUser = await userRepository.GetCurrentUserAsync();
            try
            {
                await chatService.DeleteStudySetAsync(studySetId, sessionId, currentUser.Id);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet("chat-session/{sessionId}/flashcard-set/{studySetId}")]
        public async Task<ActionResult<FlashcardSetDTO>> GetFlashcardSet(int sessionId, int studySetId)
        {
            var currentUser = await userRepository.GetCurrentUserAsync();
            try
            {
                var result = await chatService.GetFlashcardSetAsync(studySetId, sessionId, currentUser.Id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet("chat-session/{sessionId}/test-set/{studySetId}")]
        public async Task<ActionResult<TestSetDTO>> GetTestSet(int sessionId, int studySetId)
        {
            var currentUser = await userRepository.GetCurrentUserAsync();
            try
            {
                var result = await chatService.GetTestSetAsync(studySetId, sessionId, currentUser.Id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet("chat-session/{sessionId}/test-set/{studySetId}/progress")]
        public async Task<ActionResult<TestProgressDTO>> GetTestProgress(int sessionId, int studySetId)
        {
            var currentUser = await userRepository.GetCurrentUserAsync();
            try
            {
                var result = await chatService.GetTestProgressAsync(studySetId, sessionId, currentUser.Id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpPost("chat-session/{sessionId}/save-attempt")]
        public async Task<IActionResult> SaveAttempt(int sessionId, [FromBody] SaveAttemptRequest request)
        {
            var currentUser = await userRepository.GetCurrentUserAsync();
            try
            {
                await chatService.SaveAttemptAsync(sessionId, currentUser.Id, request);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpPost("chat-session/{sessionId}/test-set/{studySetId}/finish")]
        public async Task<IActionResult> FinishTest(int sessionId, int studySetId)
        {
            var currentUser = await userRepository.GetCurrentUserAsync();
            try
            {
                await chatService.FinishTestAsync(studySetId, sessionId, currentUser.Id);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}