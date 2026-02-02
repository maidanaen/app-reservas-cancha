using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Noticia
    {
        public int Id { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string Cuerpo { get; set; } = string.Empty;
        public DateTime FechaPublicacion { get; set; } = DateTime.Now;
        public string? ImagenUrl { get; set; }
    }
}
