using Domain.Interfaces;
using Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Backend.Services;
using System.Text.Json.Serialization;
using Infrastructure.Persistencia;
// using Swashbuckle.AspNetCore.SwaggerGen; // No es estrictamente necesario aquí si no configuras opciones avanzadas

var builder = WebApplication.CreateBuilder(args);

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
    options.UseSqlServer(connectionString));

// Inyección de Dependencias (Repositorios)
builder.Services.AddScoped<ICanchaRepository, CanchaRepository>();
builder.Services.AddScoped<IReservaRepository, ReservaRepository>();
builder.Services.AddScoped<MercadoPagoService>();
var app = builder.Build();

// 2. Activar Swagger UI (AQUÍ ESTABA EL ERROR)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();   // Genera el JSON
    app.UseSwaggerUI(); // <--- ESTA FALTABA: Genera la interfaz gráfica
}

// 3. He borrado el bloque de "app.MapOpenApi();" para que no estorbe.

app.UseHttpsRedirection();
// (Activar la regla):
app.UseCors("PermitirFrontend");

app.UseAuthorization();
app.UseStaticFiles();
app.MapControllers();

app.Run();