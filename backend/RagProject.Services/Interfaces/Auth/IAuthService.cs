using RagProject.Data;

namespace RagProject.Services
{
    public interface IAuthService
    {
        Task<User> RegisterAsync(RegisterDTO registerDto, byte[] hashedPassword, byte[] saltPassword);
        Task<User> LoginAsync(LoginDTO loginDto);
        Task Logout();
        Task GenerateAuthResponse(User user);
    }
}
