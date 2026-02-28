using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using RagProject.Data;

namespace RagProject.Services
{
    public class LocalStorageService : IStorageService
    {
        private readonly string _storagePath;

        public LocalStorageService(IConfiguration config)
        {
            _storagePath = config["Storage:LocalPath"] ?? Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
            if (!Directory.Exists(_storagePath)) Directory.CreateDirectory(_storagePath);
        }

        public async Task<string> SaveFileAsync(IFormFile file)
        {
            var fileExtension = Path.GetExtension(file.FileName);
            var storageKey = $"{Guid.NewGuid()}{fileExtension}";
            var fullPath = Path.Combine(_storagePath, storageKey);

            using var stream = new FileStream(fullPath, FileMode.Create);
            await file.CopyToAsync(stream);

            return storageKey;
        }

        public string GetPhysicalPath(string storageKey) => Path.Combine(_storagePath, storageKey);

        public async Task DeleteFileAsync(string storageKey)
        {
            var path = GetPhysicalPath(storageKey);
            if (File.Exists(path)) File.Delete(path);
            await Task.CompletedTask;
        }
    }
}
