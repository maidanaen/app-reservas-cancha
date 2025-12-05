using Domain.Interfaces;
using Infrastructure.Persistence;
using Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
// using Swashbuckle.AspNetCore.SwaggerGen; // No es estrictamente necesario aquí si no configuras opciones avanzadas

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// 1. Agregar configuración de Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configuración de la Base de Datos
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// Inyección de Dependencias (Repositorios)
builder.Services.AddScoped<ICanchaRepository, CanchaRepository>();

var app = builder.Build();

// 2. Activar Swagger UI (AQUÍ ESTABA EL ERROR)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();   // Genera el JSON
    app.UseSwaggerUI(); // <--- ESTA FALTABA: Genera la interfaz gráfica
}

// 3. He borrado el bloque de "app.MapOpenApi();" para que no estorbe.

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();