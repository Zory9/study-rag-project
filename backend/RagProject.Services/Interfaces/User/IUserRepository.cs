using RagProject.Data;

namespace RagProject.Services
{
    public interface IUserRepository
    {
        Task<CurrentUserDTO> GetCurrentUserAsync();
        Task<User> UpdateUserAsync(int userId);
        Task DeleteUser(int userId);
    }
}
