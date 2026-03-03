using Microsoft.EntityFrameworkCore;
using RagProject.Data;

namespace RagProject.Services
{
    public class RefreshTokenService(DataContext dataContext) : IRefreshTokenService
    {
        private readonly DataContext _dataContext = dataContext;

        public async Task<RefreshToken> AddRefreshTokenAsync(RefreshToken refreshToken)
        {
            _dataContext.RefreshTokens.Add(refreshToken);
            await _dataContext.SaveChangesAsync();
            return refreshToken;
        }

        public async Task<RefreshToken> GetRefreshTokenAsync(string refreshToken)
        {
            return await _dataContext.RefreshTokens.FirstOrDefaultAsync(t => t.Token == refreshToken);
        }

        public async Task<RefreshToken> GetRefreshTokenByUserIdAsync(int userId)
        {
            return await _dataContext.RefreshTokens.FirstOrDefaultAsync(t => t.UserId == userId && t.IsRevoked == false);
        }

        public async Task SaveChangesAsync()
        {
            await _dataContext.SaveChangesAsync();
        }
    }
}
