using Microsoft.AspNetCore.Http;

namespace RagProject.Services
{
    public class CookieService(IHttpContextAccessor httpContextAccessor) : ICookieService
    {
        private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;

        public void CreateCookie(string name, string value)
        {
            _httpContextAccessor.HttpContext.Response.Cookies.Append(name, value, new CookieOptions()
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Domain = "localhost",
                Path = "/",
                Expires = name == "AccessToken"
                    ? DateTime.UtcNow.AddDays(1)
                    : DateTime.UtcNow.AddDays(7),
            });
        }

        public void DeleteCookie(string name)
        {
            _httpContextAccessor.HttpContext.Response.Cookies.Delete(name, new CookieOptions()
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Domain = "localhost",
                Path = "/"
            });
        }
    }
}
