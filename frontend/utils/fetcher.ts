// utils/fetcher.ts
export const fetcher = async (url: string) => {
    // 1. Obtenemos el token guardado del login
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // 2. Configuramos los headers
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`; // 🟢 SE INYECTA EL TOKEN JWT AUTOMÁTICAMENTE
    }
    
    // 3. Hacemos el fetch (Aceptamos certs autofirmados en local por si acaso)
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const res = await fetch(url, { headers });

    // 4. Si el token expiró o es inválido, el backend tirará un 401 Unauthorized
    if (res.status === 401) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/admin/login'; // Redirigir si caducó la sesión
        }
        throw new Error('No autorizado');
    }

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.mensaje || 'Error al cargar los datos');
    }

    return res.json();
};
