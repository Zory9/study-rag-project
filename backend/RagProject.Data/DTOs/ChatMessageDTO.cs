namespace RagProject.Data
{
    public class ChatMessageDTO
    {
        public MessageRole Role { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime DateCreated { get; set; }
        public List<string> Sources { get; set; } = new List<string>();
    }
}