using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RagProject.Data
{
    public class User : BaseModel
    {
        [Required, EmailAddress, MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string Username { get; set; } = string.Empty;

        [Required, MinLength(10), MaxLength(200)]
        public byte[] PasswordHash { get; set; } = Array.Empty<byte>();

        [Required, MinLength(10), MaxLength(200)]
        public byte[] PasswordSalt { get; set; } = Array.Empty<byte>();

        [JsonIgnore]
        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

        public CurrentUserDTO ToCurrentUserDto()
        {
            return new CurrentUserDTO
            {
                Id = Id,
                Email = Email,
                Username = Username,
                DateCreated = DateCreated
            };
        }
    }
}
