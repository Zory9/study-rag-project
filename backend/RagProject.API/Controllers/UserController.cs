using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RagProject.Data;
using RagProject.Services;

namespace RagProject.API
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController(IUserRepository userRepository) : Controller
    {
        private readonly IUserRepository _userRepository = userRepository;

        [HttpGet]
        [Route("get-user")]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                CurrentUserDTO currentUser = await _userRepository.GetCurrentUserAsync();
                return Ok(currentUser);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
