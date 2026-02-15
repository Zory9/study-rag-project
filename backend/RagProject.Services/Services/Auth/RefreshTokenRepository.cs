using Microsoft.AspNetCore.Http;
using RagProject.Data;

namespace RagProject.Services
{
    public class RefreshTokenRepository(IHttpContextAccessor httpContextAccessor, IRefreshTokenService refreshTokenService,
        IJwtService jwtService, ICookieService cookieService, IUserService userService) : IRefreshTokenRepository
    {
        private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;
        private readonly IRefreshTokenService _refreshTokenService = refreshTokenService;
        private readonly IJwtService _jwtService = jwtService;
        private readonly ICookieService _cookieService = cookieService;
        private readonly IUserService _userService = userService;

        public async Task<NewRefreshTokenResponse> GenerateNewRefreshTokenAsync()
        {
            string refreshToken = _httpContextAccessor.HttpContext.Request.Cookies["RefreshToken"]!;
            RefreshToken storedToken = await _refreshTokenService.GetRefreshTokenAsync(refreshToken);

            if (storedToken is null || storedToken.ExpiryDate < DateTime.Now || storedToken.IsRevoked)
            {
                throw new Exception("Invalid or expired refresh token.");
            }

            storedToken.IsRevoked = true;

            string newRefreshToken = _jwtService.GenerateRefreshToken(storedToken.UserId);
            string newAccessToken = _jwtService.GenerateAcessToken(storedToken.UserId);

            RefreshToken newRefreshTokenEntity = await _refreshTokenService.AddRefreshTokenAsync(new RefreshToken()
            {
                Token = newRefreshToken,
                ExpiryDate = DateTime.Now.AddDays(7),
                UserId = storedToken.UserId,
            });

            CurrentUserDTO user = (await _userService.GetUserByIdAsync(storedToken.UserId)).ToCurrentUserDto();

            _cookieService.DeleteCookie("RefreshToken");
            _cookieService.CreateCookie("AccessToken", newAccessToken);
            _cookieService.CreateCookie("RefreshToken", newRefreshToken);

            return new NewRefreshTokenResponse()
            {
                NewAccessToken = newAccessToken,
                NewRefreshToken = newRefreshToken,
                ExpiresIn = 600,
                Username = user.Username
            };
        }
    }
}

