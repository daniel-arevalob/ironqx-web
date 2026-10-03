# Asistente de admision

El widget llama a `https://app.ironqx.fit/api/commercial-chat` y
`/api/commercial-lead`. El backend vive en el repositorio de la app para reutilizar
los secretos de Anthropic y Resend, sin duplicarlos ni enviarlos al navegador.
No usa tablas ni contexto de pacientes: su almacenamiento es la D1 independiente
`ironqx-commercial`, enlazada a Pages como `COMMERCIAL_DB`.

## Activacion

En Cloudflare Turnstile crear un widget Managed para `ironqx.fit` y
`www.ironqx.fit`. En Pages **ironqx-app**, entorno Production:

- `COMMERCIAL_TURNSTILE_SITE_KEY`: clave publica del widget.
- `COMMERCIAL_TURNSTILE_SECRET`: secreto del widget, como Secret.
- `ANTHROPIC_API_KEY` y `RESEND_API_KEY`: ya usados por la app.
- `COMMERCIAL_MONTHLY_LIMIT_USD`: opcional; valor inicial 2 USD, maximo 2 USD.
  Un valor menor reduce el limite; nunca aumenta el presupuesto de pacientes.

Tras guardar secretos, redesplegar **ironqx-app** para enlazarlos. El backend
devuelve `ready: false` si falta configuracion: el widget ofrece entonces
solicitud guiada y WhatsApp, sin llamadas de IA ni correos no protegidos.

## Reglas

- 4 sesiones por IP y 100 globales cada 24 horas.
- Sesion opaca de 24 horas, token almacenado solo en sessionStorage.
- 24 intentos por sesion, 40 por IP cada 24 horas y 4 segundos entre intentos.
- Reserva monetaria atomica antes de cada llamada; un timeout conserva la
  reserva. Request IDs deduplican reintentos y sobreviven a recargar el chat.
- 2 solicitudes de correo por IP y 30 globales cada 24 horas; una por sesion.
- Correos solo a `ironqx.coach@gmail.com`, con precio oficial y consentimiento.
  Resend usa Idempotency-Key; reintentos inciertos conservan el mismo id y
  dejan de reenviarse antes de expirar su ventana de 24 horas.
- WhatsApp abre `+593 96 3252 197` con el resumen; el visitante pulsa enviar.
- Ningun pago, cita, diagnostico ni contratacion se confirma automaticamente.
- Datos de visitantes y conversaciones: maximo 35 dias; limpieza al abrir
  nuevas sesiones. No se guardan IPs sin hash ni se registran mensajes en logs.

## Catalogo

Fuente oficial: `functions/api/_commercial-data.js` en **IronQx App**.
El fallback de `assistant.js` debe conservar sus nombres, precios y periodos.
La version de los tres assets del widget debe subirse al modificar el cliente.
La web se despliega por push a `main`; la app por push a `master`.

Los iconos son un bundle reducido de Lucide (ISC), servido localmente.
