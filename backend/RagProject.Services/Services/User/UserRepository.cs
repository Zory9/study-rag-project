using RagProject.Data;

namespace RagProject.Services
{
    public class UserRepository(IUserService userService) : IUserRepository
    {
        private readonly IUserService _userService = userService;

        public async Task<CurrentUserDTO> GetCurrentUserAsync()
        {
            User user = await _userService.GetCurrentUserAsync();
            return user.ToCurrentUserDto();
        }

        public Task DeleteUser(int userId)
        {
            throw new NotImplementedException();
        }

        public Task<User> UpdateUserAsync(int userId)
        {
            throw new NotImplementedException();
        }
    }
}
