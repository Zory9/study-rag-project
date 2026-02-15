using System.ComponentModel.DataAnnotations;

namespace RagProject.Data
{
    public class ChatMessage : BaseModel
    {
        [Required]
        public MessageRole Role { get; set; }

        [Required]
        public string Content { get; set; } = string.Empty;

        public string? SourceMetadata { get; set; }

        [Required]
        public int ChatSessionId { get; set; }
        public ChatSession? ChatSession { get; set; }
    }
}