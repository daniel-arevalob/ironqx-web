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
- `COMMERCIAL_MONTHLY_LIMIT_USD`: opcional; 10 USD por defecto, 50 como techo.
  Es un presupuesto aparte: nunca toca el de IronQx AI de pacientes.
- `COMMERCIAL_MODEL`: opcional; por defecto Claude Haiku 5.5, con respaldo a
  Sonnet 5.5 si Haiku rechaza la peticion o devuelve una respuesta invalida.
  `sonnet` usa Sonnet 5.5 directamente. Las dos llamadas cuentan en el consumo.

Tras guardar secretos, redesplegar **ironqx-app** para enlazarlos. El backend
devuelve `ready: false` si falta configuracion: el widget ofrece entonces
solicitud guiada y WhatsApp, sin llamadas de IA ni correos no protegidos.

## Ficha de ingreso

El asistente entrevista al visitante y arma una ficha clinica por secciones
(datos, motivo, salud, medidas, habitos, preferencias). El servidor decide el
siguiente dato esencial y se lo indica al modelo; cada campo tiene tope de
longitud. Al completarla, el visitante la revisa y la envia: Daniel recibe un
correo HTML maquetado con "Puntos a revisar" (reglas fijas, no del modelo) y un
resumen marcado como IA. El correo usa la ficha guardada en el servidor; el
navegador solo corrige contacto, servicio y datos basicos. Pedir dosis o
diagnosticos se deriva a Daniel sin cortar la entrevista; contar la medicacion
propia es parte de la ficha.

Los nombres de pila reconocidos proponen un sexo orientativo mediante una lista
conservadora del servidor, no mediante terminaciones o una suposicion del modelo.
Nombres ambiguos o desconocidos requieren pregunta. `sexSource=name` identifica
la inferencia en la ficha y el correo; una respuesta explicita prevalece y puede
corregirse en el formulario final. Cambiar el nombre recalcula solo inferencias,
nunca una respuesta explicita. No se usa la inferencia para prescribir o diagnosticar.

Edad y medidas con unidades se verifican en el servidor: un peso meta, la edad
de un familiar o minutos de entrenamiento no sustituyen datos personales.
Las negativas breves responden al campo preguntado sin insistir. Las correcciones
de la revision sobreviven a nuevos turnos; una correccion posterior en el chat
prevalece. Un fallo temporal no elimina la sesion; cuando expira se limpian los
identificadores pendientes, conservando el borrador.

## Reglas

- 4 sesiones por IP y 100 globales cada 24 horas.
- Sesion opaca de 24 horas, token almacenado solo en sessionStorage.
- 40 intentos por sesion, 80 por IP cada 24 horas y 4 segundos entre intentos:
  una ficha completa lleva unos 15 a 20 turnos.
- Reserva monetaria atomica antes de cada llamada; un timeout conserva la
  reserva. Request IDs deduplican reintentos y sobreviven a recargar el chat.
- 2 solicitudes de correo por IP y 30 globales cada 24 horas; una por sesion.
- Correos solo a `ironqx.coach@gmail.com`, con precio oficial y consentimiento
  explicito para compartir los datos de salud.
  Resend usa Idempotency-Key; reintentos inciertos conservan el mismo id y
  dejan de reenviarse antes de expirar su ventana de 24 horas.
- WhatsApp abre `+593 96 3252 197` con el resumen; el visitante pulsa enviar.
- Ningun pago, cita, diagnostico ni contratacion se confirma automaticamente.
- Datos de visitantes y conversaciones: maximo 35 dias; limpieza al abrir
  nuevas sesiones. No se guardan IPs sin hash ni se registran mensajes en logs.

## Catalogo

Fuente oficial: `functions/api/_commercial-data.js` en **IronQx App**.
El fallback de `assistant.js` debe conservar sus nombres, precios y periodos.
`AI_ADDON` define IronQx AI + VISION como complemento opcional de 10 USD/mes
para los protocolos mensuales. La solicitud lo deja desmarcado y lo elimina al
elegir consulta puntual. Cambiar servicio o complemento exige aceptar otra vez
el importe. El servidor calcula el total, no acepta precios del navegador y
no permite que el modelo seleccione el complemento por el visitante.
Correo y WhatsApp incluyen la seleccion y el total. No activan permisos de
pacientes ni procesan pagos: Daniel coordina la contratacion y la prueba de
7 dias, sin cobro automatico. No hay caducidad automatica de esa prueba.
La version de los tres assets del widget debe subirse al modificar el cliente.
La web se despliega por push a `main`; la app por push a `master`.

Los iconos son un bundle reducido de Lucide (ISC), servido localmente.
