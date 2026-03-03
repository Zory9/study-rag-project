using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RagProject.Data
{
    public class RefreshToken : BaseModel
    {
        public int UserId { get; set; }
        [MaxLength(512)]
        public string Token { get; set; } = string.Empty;
        public bool IsRevoked { get; set; }
        public DateTime ExpiryDate { get; set; }

        [JsonIgnore]
        public User? User { get; set; }
    }

    public class NewRefreshTokenResponse
    {
        public string NewAccessToken { get; set; } = string.Empty;
        public string NewRefreshToken { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public int ExpiresIn { get; set; }
    }
}
