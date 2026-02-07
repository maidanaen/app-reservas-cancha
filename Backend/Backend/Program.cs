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
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Inyección de Dependencias (Repositorios)
builder.Services.AddScoped<ICanchaRepository, CanchaRepository>();
builder.Services.AddScoped<IReservaRepository, ReservaRepository>();
builder.Services.AddScoped<MercadoPagoService>();

var app = builder.Build();
// --- 🟢 BLOQUE NUEVO: Auto-Migración y Swagger en Producción ---

// 1. Aplicar migraciones automáticamente al iniciar
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        context.Database.Migrate(); // ¡Esto crea las tablas en Railway!
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Ocurrió un error al migrar la base de datos.");
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