using Domain.Interfaces;
using Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Backend.Services;
using System.Text.Json.Serialization;
using Infrastructure.Persistencia;
// using Swashbuckle.AspNetCore.SwaggerGen; // No es estrictamente necesario aquí si no configuras opciones avanzadas

var builder = WebApplication.CreateBuilder(args);
// 1. Configurar CORS para permitir que Vercel acceda
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirVercel", policy =>
    {
        policy.AllowAnyOrigin() // Permitimos acceso desde cualquier lugar (para evitar problemas)
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddControllers().AddJsonOptions(x =>
    x.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);
// (Permiso para el Frontend):
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000") // La dirección de tu Next.js
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// 1. Agregar configuración de Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configuración de la Base de Datos
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
                       ?? builder.Configuration.GetConnectionString("DefaultConnection");
// Detectar si es una URL de Railway (empieza con postgres://) y traducirla
if (!string.IsNullOrEmpty(connectionString) && connectionString.Contains("://"))
{
    try
    {
        var databaseUri = new Uri(connectionString);
        var userInfo = databaseUri.UserInfo.Split(':');

        // Reconstruimos la cadena al formato que le gusta a .NET (Npgsql)
        connectionString = $"Host={databaseUri.Host};" +
                           $"Port={databaseUri.Port};" +
                           $"Username={userInfo[0]};" +
                           $"Password={userInfo[1]};" +
                           $"Database={databaseUri.LocalPath.TrimStart('/')};" +
                           "Ssl Mode=Require;Trust Server Certificate=true";
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error parseando la URL de conexión: {ex.Message}");
    }
}

// Conectar usando la cadena (ya sea la original o la traducida)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Inyección de Dependencias (Repositorios)
builder.Services.AddScoped<ICanchaRepository, CanchaRepository>();
builder.Services.AddScoped<IReservaRepository, ReservaRepository>();
builder.Services.AddScoped<MercadoPagoService>();

var app = builder.Build();
// --- 🟢 BLOQUE NUEVO: Auto-Migración y Swagger en Producción ---

// 1. Aplicar migraciones automáticamente al iniciar
// --- INICIO DEL BLOQUE DE AUTO-MIGRACIÓN ---
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        // Esto ejecuta "update-database" automáticamente en la nube
        context.Database.Migrate();
        Console.WriteLine("¡Migraciones aplicadas exitosamente!");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error aplicando migraciones: {ex.Message}");
    }
}
// 2. Activar Swagger siempre (incluso en producción)
app.UseSwagger();
app.UseSwaggerUI();


app.UseHttpsRedirection();
// (Activar la regla):
app.UseCors("PermitirVercel");

app.UseAuthorization();
app.UseStaticFiles();
app.MapControllers();

app.Run();