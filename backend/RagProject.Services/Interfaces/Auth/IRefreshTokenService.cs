using RagProject.Data;

namespace RagProject.Services
{
    public interface IRefreshTokenService
    {
        Task<RefreshToken> AddRefreshTokenAsync(RefreshToken refreshToken);
        Task<RefreshToken> GetRefreshTokenAsync(string refreshToken);
        Task<RefreshToken> GetRefreshTokenByUserIdAsync(int userID);
    }
}
