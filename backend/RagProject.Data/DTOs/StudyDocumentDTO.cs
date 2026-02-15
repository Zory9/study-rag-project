namespace RagProject.Data
{
    public class StudyDocumentDTO
    {
        public int Id { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string? FileSummary { get; set; }
        public DateTime DateCreated { get; set; }
    }
}