using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;


namespace Domain.Entities
{
    public class Usuario
    {
        public int Id { get; set; }
        public string userName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty; // En el futuro la encriptaremos
        public string NombreNegocio { get; set; } = "Sin nombre";
        public bool Activo { get; set; } = true;
        public DateTime FechaAlta { get; set; }
        public DateTime? UltimoPago { get; set; }
        public string? LogoUrl { get; set; }
        public string? FotoUrl { get; set; }
    }
}
