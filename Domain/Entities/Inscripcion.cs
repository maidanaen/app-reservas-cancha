using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json.Serialization; 

namespace Domain.Entities
{
    public class Inscripcion
    {
        public int Id { get; set; }
        public int PartidoId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Contacto { get; set; } = string.Empty;

        [JsonIgnore] // Para que no intente traer el partido entero de vuelta
        public Partido? Partido { get; set; }
    }
}