# IRONQx Web

Sitio público de IRONQx. Cloudflare Pages despliega la rama `main`.

## Capacidad de pacientes

`/api/capacity` publica exclusivamente un conteo agregado. Nunca entrega nombres, correos, objetivos ni datos clínicos.

Configurar en Cloudflare Pages:

- `SUPABASE_URL`: URL del proyecto.
- `SUPABASE_SERVICE_ROLE_KEY`: secreto cifrado; solo está disponible en la función del servidor.
- `IRONQX_COACH_EMAIL`: correo del profesional propietario de los pacientes.
- `IRONQX_CAPACITY`: capacidad máxima de acompañamiento; valor inicial sugerido: `20`.

Si la función no está configurada o Supabase no responde, la web oculta los números y muestra “Consulta disponibilidad actual”; nunca utiliza cifras ficticias.
