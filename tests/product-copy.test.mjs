import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const section = id => html.match(new RegExp('<section id="'+id+'"[^>]*>([\\s\\S]*?)</section>'))?.[1] || '';
const app = section('tecnologia'), ai = section('ia-bot');

test('la app explica plan, registros, reportes y contacto humano sin garantizar mediciones', () => {
  for (const text of ['Alimentación y entrenamiento a mano', 'Un chat directo con Daniel',
    'cuando hay mediciones disponibles', 'Si Daniel activa las fotos de comidas']) assert.ok(app.includes(text), text);
  assert.doesNotMatch(app, /reportes descargables|semana a semana/);
});

test('la IA y la admision son servicios separados con un CTA publico explicito', () => {
  assert.ok(ai.includes('el contacto con Daniel sigue aparte'));
  assert.ok(ai.includes('asistente de admisión de esta web es gratuito'));
  assert.ok(ai.includes('ni accede a sus planes o conversaciones'));
  assert.match(ai, /data-open-assistant[^>]*>Elegir consulta o protocolo<\/button>/);
});

test('las capacidades visuales y equivalencias no prometen exactitud ni edicion del plan', () => {
  for (const text of ['porción alternativa por calorías', 'no reescribe tu plan',
    'etiqueta nutricional', 'no sustituye una báscula', 'no diagnostica']) assert.ok(ai.includes(text), text);
});

test('acceso individual, consentimiento y creditos reemplazan promesas ilimitadas', () => {
  for (const text of ['habilita el acceso de forma individual', 'proveedores de IA',
    '50 créditos por semana', 'modo sin cifras']) assert.ok(ai.includes(text), text);
  assert.doesNotMatch(html, /24\/7|precisión clínica de IronQx|Acceso prioritario a app/);
});

test('los metadatos describen la app y la IA sin cambiar contacto ni precios', () => {
  for (const name of ['description', 'og:description', 'twitter:description']) {
    const meta = html.match(new RegExp('<meta (?:name|property)="'+name+'" content="([^"]+)"'))?.[1];
    assert.ok(meta?.includes('App'));
    assert.ok(meta?.includes('VISION'));
  }
  assert.ok(html.includes('"telephone": "+593963252197"'));
  for (const price of ['60', '75', '100']) assert.ok(html.includes('"price":"'+price+'"'));
});
