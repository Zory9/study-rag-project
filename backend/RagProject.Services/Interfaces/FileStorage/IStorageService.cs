using Microsoft.AspNetCore.Http;
using RagProject.Data;

namespace RagProject.Services
{
    public interface IStorageService
    {
        Task<string> SaveFileAsync(IFormFile file);

        string GetPhysicalPath(string storageKey);

        Task DeleteFileAsync(string storageKey);
    }
}
