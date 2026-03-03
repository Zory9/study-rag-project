using System.Security.Claims;
using RagProject.Data;

namespace RagProject.Services
{
    public interface IUserService
    {
        Task<User> CreateUserAsync(User user);
        Task<User> GetUserByEmailAsync(string email);
        Task<User> GetUserByUsernameAsync(string name);
        Task<User> GetUserByIdAsync(int userId);
        Task<User> GetCurrentUserAsync();   
        Task ValidateUserAsync(RegisterDTO registerDto);
        Task<bool> UserExistsAsync(string email);
        bool AreFieldsFilled(RegisterDTO registerDto);
        bool ValidateEmailAndPassword(string email, string password);
        (byte[] hashedPassword, byte[] saltPassword) HashPassword(RegisterDTO registerDto);
        bool CheckPassword(User user, LoginDTO loginDto);
        string GetCurrentUserUsername(ClaimsPrincipal userPrincipal);
    }
}
