using Domain.Interfaces;
using Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Backend.Services;
using System.Text.Json.Serialization;
using Infrastructure.Persistencia;


AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
var builder = WebApplication.CreateBuilder(args);

// ==================================================================
// 1. CONFIGURACIÓN DE CORS (Permitir acceso a Vercel)
// ==================================================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirVercel", policy =>
    {
        policy.AllowAnyOrigin()  // Permitimos todo para evitar bloqueos
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// ==================================================================
// 2. CONTROLADORES Y JSON
// ==================================================================
builder.Services.AddControllers().AddJsonOptions(x =>
    x.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);

// 3. Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ==================================================================
// 4. BASE DE DATOS (Conexión Inteligente para Railway)
// ==================================================================
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
                       ?? builder.Configuration.GetConnectionString("DefaultConnection");

// Detectar si es una URL de Railway (tiene "://") y traducirla
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

// ==================================================================
// 5. INYECCIÓN DE DEPENDENCIAS
// ==================================================================
builder.Services.AddScoped<ICanchaRepository, CanchaRepository>();
builder.Services.AddScoped<IReservaRepository, ReservaRepository>();
// Asegúrate de que MercadoPagoService tenga su propia config si la necesita
builder.Services.AddScoped<MercadoPagoService>();

var app = builder.Build();

// ==================================================================
// 6. AUTO-MIGRACIÓN (Crear tablas al iniciar)
// ==================================================================
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        // Esto ejecuta "update-database" automáticamente en la nube
        context.Database.Migrate();
        Console.WriteLine("✅ ¡Migraciones aplicadas exitosamente!");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error aplicando migraciones: {ex.Message}");
    }
}

// ==================================================================
// 7. PIPELINE (Orden de ejecución)
// ==================================================================

app.UseSwagger();
app.UseSwaggerUI(); // Swagger visible siempre

app.UseHttpsRedirection();

// ¡IMPORTANTE! Usar la política "PermitirVercel" que definimos arriba
app.UseCors("PermitirTodo");

app.UseAuthorization();
app.UseStaticFiles();

app.MapControllers();

// Arrancar en el puerto que diga Railway o el 8080 por defecto
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
app.Run($"http://0.0.0.0:{port}");