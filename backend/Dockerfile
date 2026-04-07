# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project files first
COPY RagProject.Data/RagProject.Data.csproj       RagProject.Data/
COPY RagProject.Services/RagProject.Services.csproj RagProject.Services/
COPY RagProject.API/RagProject.API.csproj          RagProject.API/
RUN dotnet restore RagProject.API/RagProject.API.csproj

# Copy everything and publish
COPY . .
RUN dotnet publish RagProject.API/RagProject.API.csproj \
    -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 5153
ENTRYPOINT ["dotnet", "RagProject.API.dll"]
