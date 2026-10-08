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

test('los complementos son dos tarjetas hermanas, opcionales y con sus precios independientes', () => {
  const cards=[...html.matchAll(/<article class="addon-card ([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length,2);
  for(const [index,price,name] of [[0,'10','AI + VISION'],[1,'15','Forged']]){
    const card=cards[index][2];assert.ok(card.includes(name));assert.ok(card.includes('Opcional'));assert.ok(card.includes('<strong>+$'+price+'</strong>'));
    assert.ok(card.includes('/mes adicional'));assert.ok(card.includes('class="addon-footer"'));assert.ok(card.includes('class="addon-cta"'));
  }
  assert.ok(html.includes('estos servicios se contratan por separado'));
  assert.doesNotMatch(html,/\.ai-addon-offer\s*\{|class="reveal forged-x/);
});

test('las portadas reservan dimensiones y se sirven como WebP ligero sin animacion', () => {
  for(const name of ['ai-vision-cover-v1.webp','forged-x-cover-v1.webp']){
    const bytes=fs.readFileSync(new URL('../images/'+name,import.meta.url));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(bytes.length<100000);
    assert.ok(html.includes('src="/images/'+name+'" width="960" height="640" loading="lazy" decoding="async"'));
  }
  assert.match(html,/\.addon-cover\s*\{[^}]*aspect-ratio: 2 \/ 1/);
  assert.match(html,/\.addons-grid\s*\{[^}]*minmax\(0,1fr\)/);
  assert.match(html,/@media \(max-width: 1023px\) \{ \.addon-footer \{ padding-right: 48px;/);
});

test('los CTAs llevan a la IA existente y al WhatsApp personal, sin contratar automaticamente', () => {
  const cards=[...html.matchAll(/<article class="addon-card ([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
  assert.match(cards[0][2],/class="addon-cta" href="#ia-bot"/);
  assert.match(cards[1][2],/class="addon-cta" href="https:\/\/wa.me\/593963252197\?/);
  assert.ok(cards[1][2].includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(cards[1][2].includes('No normaliza el uso ni sustituye la atención especializada'));
});
