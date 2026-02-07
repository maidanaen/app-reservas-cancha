# 1. Usamos la imagen oficial de .NET 9 para construir
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# 2. Copiamos TODO el repositorio al contenedor
COPY . .

# 3. Restauramos dependencias usando la Solución (que está dentro de la carpeta Backend)
RUN dotnet restore "Backend/AppReservasCanchas.sln"

# 4. Publicamos el proyecto de la API (Backend/Backend)
RUN dotnet publish "Backend/Backend/Backend.csproj" -c Release -o /app/publish

# 5. Imagen final para ejecutar (más liviana)
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .

# 6. Definimos el puerto (Railway usa la variable PORT automáticamente)
ENV ASPNETCORE_URLS=http://+:8080

# 7. El punto de entrada es la DLL del Backend
ENTRYPOINT ["dotnet", "Backend.dll"]