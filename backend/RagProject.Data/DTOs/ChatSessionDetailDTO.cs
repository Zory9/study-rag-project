namespace RagProject.Data
{
    public class ChatSessionDetailDTO
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public List<ChatMessageDTO> Messages { get; set; } = new List<ChatMessageDTO>();
        public List<StudyDocumentDTO> AttachedDocuments { get; set; } = new();
    }
}