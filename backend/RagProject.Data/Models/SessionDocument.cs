namespace RagProject.Data
{
    public class SessionDocument
    {
        public int ChatSessionId { get; set; }
        public ChatSession? ChatSession { get; set; }

        public int StudyDocumentId { get; set; }
        public StudyDocument? StudyDocument { get; set; }
    }
}