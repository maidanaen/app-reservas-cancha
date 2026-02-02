using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Domain.Entities;
using Backend.Domain.Entities;

namespace Infrastructure.Persistencia
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Cancha> Canchas { get; set; }
        public DbSet<Reserva> Reservas { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Consumo> Consumos { get; set; }
        public DbSet<Producto> Productos { get; set; }
        public DbSet<Caja> Cajas { get; set; }
        public DbSet<Mesa> Mesas { get; set; }
        public DbSet<Noticia> Noticias { get; set; }
        public DbSet<Partido> Partidos { get; set; }
        public DbSet<Inscripcion> Inscripciones { get; set; }
        public DbSet<CajaTurno> CajaTurno { get; set; }
        public DbSet<MovimientoCaja> MovimientoCaja { get; set; }
    }
}