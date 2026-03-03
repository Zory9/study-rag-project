using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace RagProject.Services
{
    public class JwtService(IConfiguration configuration) : IJwtService
    {
        private readonly string _securityKey = configuration["Appsettings:JwtKey"] ?? throw new InvalidOperationException("JWT key is not configured.");
        private readonly string _issuer = configuration["Appsettings:JwtIssuer"] ?? throw new InvalidOperationException("JWT issuer is not configured.");
        private readonly string _audience = configuration["Appsettings:JwtAudience"] ?? throw new InvalidOperationException("JWT audience is not configured.");

        public string GenerateAcessToken(int userID)
        {
            SymmetricSecurityKey symmetricSecurityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_securityKey));
            SigningCredentials credentials = new SigningCredentials(symmetricSecurityKey, SecurityAlgorithms.HmacSha256Signature);

            Claim[] claims =
            {
                new Claim(JwtRegisteredClaimNames.Sub, userID.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            JwtHeader header = new JwtHeader(credentials);
            JwtPayload payload = new JwtPayload(
                issuer: _issuer,
                audience: _audience,
                claims: claims,
                notBefore: null,
                expires: DateTime.UtcNow.AddDays(1)
            );

            JwtSecurityToken accessToken = new JwtSecurityToken(header, payload);
            string accessTokenString = new JwtSecurityTokenHandler().WriteToken(accessToken);

            return accessTokenString;
        }

        public string GenerateRefreshToken(int userID)
        {
            byte[] randomNumber = new byte[64];

            using (RandomNumberGenerator rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomNumber);
                return Convert.ToBase64String(randomNumber);
            }
        }

        public string GetUserIdFromToken(JwtSecurityToken token)
        {
            return token.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub)!.Value;
        }

        public JwtSecurityToken Verify(string jwtToken)
        {
            JwtSecurityTokenHandler handler = new JwtSecurityTokenHandler();
            byte[] key = Encoding.UTF8.GetBytes(_securityKey);

            handler.ValidateToken(jwtToken, new TokenValidationParameters
            {
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuerSigningKey = true,
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidIssuer = _issuer,
                ValidAudience = _audience,
            }, out SecurityToken validatedToken);

            return (JwtSecurityToken)validatedToken;
        }
    }
}
