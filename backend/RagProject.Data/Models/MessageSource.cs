using System.ComponentModel.DataAnnotations;

namespace RagProject.Data
{
    public class MessageSource : BaseModel
    {
        [Required, MaxLength(512)]
        public string FileName { get; set; } = string.Empty;

        public int? Page { get; set; }
        public int? LineFrom { get; set; }
        public int? LineTo { get; set; }

        [MaxLength(500)]
        public string? Snippet { get; set; }

        public int ChatMessageId { get; set; }
        public ChatMessage? ChatMessage { get; set; }
    }
}
