using Microsoft.EntityFrameworkCore;

namespace RagProject.Data
{
    public class DataContext(DbContextOptions options) : DbContext(options)
    {
        public DbSet<User> Users { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<StudyDocument> StudyDocuments { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<MessageSource> MessageSources { get; set; }
        public DbSet<ChatSession> ChatSessions { get; set; }
        public DbSet<SessionDocument> SessionDocuments { get; set; }
        public DbSet<StudySet> StudySets { get; set; }
        public DbSet<Flashcard> Flashcards { get; set; }
        public DbSet<TestQuestion> TestQuestions { get; set; }
        public DbSet<McqOption> McqOptions { get; set; }
        public DbSet<StudySetSource> StudySetSources { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<RefreshToken>()
                .HasOne(n => n.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<StudyDocument>()
                .HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatSession>()
                .HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(m => m.ChatSession)
                .WithMany(s => s.Messages)
                .HasForeignKey(m => m.ChatSessionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MessageSource>()
                .HasOne(s => s.ChatMessage)
                .WithMany(m => m.Sources)
                .HasForeignKey(s => s.ChatMessageId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SessionDocument>()
                .HasKey(sd => new { sd.ChatSessionId, sd.StudyDocumentId });

            modelBuilder.Entity<SessionDocument>()
                .HasOne(sd => sd.ChatSession)
                .WithMany(s => s.SessionDocuments)
                .HasForeignKey(sd => sd.ChatSessionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SessionDocument>()
                .HasOne(sd => sd.StudyDocument)
                .WithMany()
                .HasForeignKey(sd => sd.StudyDocumentId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Username)
                .IsUnique();

            modelBuilder.Entity<RefreshToken>()
                .HasIndex(r => r.Token)
                .IsUnique();

            modelBuilder.Entity<ChatMessage>()
                .Property(c => c.Role)
                .HasConversion<int>();

            modelBuilder.Entity<StudySet>()
                .HasOne(ss => ss.ChatSession)
                .WithMany(s => s.StudySets)
                .HasForeignKey(ss => ss.ChatSessionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<StudySet>()
                .Property(ss => ss.Kind)
                .HasConversion<int>();

            modelBuilder.Entity<Flashcard>()
                .HasOne(f => f.StudySet)
                .WithMany(ss => ss.Flashcards)
                .HasForeignKey(f => f.StudySetId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TestQuestion>()
                .HasOne(q => q.StudySet)
                .WithMany(ss => ss.TestQuestions)
                .HasForeignKey(q => q.StudySetId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TestQuestion>()
                .Property(q => q.Kind)
                .HasConversion<int>();

            modelBuilder.Entity<McqOption>()
                .HasOne(o => o.TestQuestion)
                .WithMany(q => q.Options)
                .HasForeignKey(o => o.TestQuestionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<StudySetSource>()
                .HasOne(s => s.StudySet)
                .WithMany(ss => ss.Sources)
                .HasForeignKey(s => s.StudySetId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
