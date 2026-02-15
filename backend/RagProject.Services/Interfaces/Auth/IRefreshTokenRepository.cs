using RagProject.Data;

namespace RagProject.Services
{
    public interface IRefreshTokenRepository
    {
        Task<NewRefreshTokenResponse> GenerateNewRefreshTokenAsync();
    }
}
