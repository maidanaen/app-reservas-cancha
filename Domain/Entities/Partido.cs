using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Partido
    {
        public int Id { get; set; }
        public string Creador { get; set; } = string.Empty;
        public string Contacto { get; set; } = string.Empty;
        public DateTime Fecha { get; set; }
        public string Hora { get; set; } = string.Empty;
        public string Nivel { get; set; } = string.Empty;
        public int JugadoresFaltantes { get; set; }
        public string ClaveBorrado { get; set; } = string.Empty;
        public string Deporte { get; set; } = string.Empty;
        public string Lugar { get; set; } = string.Empty;

        public List<Inscripcion> Inscripciones { get; set; } = new List<Inscripcion>();
    }
}