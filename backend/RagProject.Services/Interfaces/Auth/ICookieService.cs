namespace RagProject.Services
{
    public interface ICookieService
    {
        void CreateCookie(string name, string value);
        void DeleteCookie(string name);
    }
}
