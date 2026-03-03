namespace RagProject.Data
{
    public class ChatMessageDTO
    {
        public MessageRole Role { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime DateCreated { get; set; }
        public List<MessageSourceDTO> Sources { get; set; } = new();
    }

    public class MessageSourceDTO
    {
        public string FileName { get; set; } = string.Empty;
        public int? Page { get; set; }
        public int? LineFrom { get; set; }
        public int? LineTo { get; set; }
        public string? Snippet { get; set; }
    }
}