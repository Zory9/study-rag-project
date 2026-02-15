using System.ComponentModel.DataAnnotations;

namespace RagProject.Data
{
    public class ChatSession : BaseModel
    {
        [Required]
        public string Title { get; set; } = "New Conversation";

        [Required]
        public int UserId { get; set; }
        public User? User { get; set; }

        public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();

        public ICollection<SessionDocument> SessionDocuments { get; set; } = new List<SessionDocument>();
    }
}