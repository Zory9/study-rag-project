using RagProject.Data;

namespace RagProject.Services
{
    public interface IAuthRepository
    {
        Task RegisterAsync(RegisterDTO registerDto);
        Task LoginAsync(LoginDTO loginDto);
        Task Logout();
    }
}
