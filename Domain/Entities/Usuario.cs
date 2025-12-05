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
    }
}
