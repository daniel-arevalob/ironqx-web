import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const section = id => html.match(new RegExp('<section\\b[^>]*\\bid="'+id+'"[^>]*>([\\s\\S]*?)</section>'))?.[1] || '';
const app = section('tecnologia'), ai = section('ia-bot');

test('la app explica plan, registros, reportes y contacto humano sin garantizar mediciones', () => {
  for (const text of ['Alimentación y entrenamiento a mano', 'Un chat directo conmigo',
    'cuando hay mediciones disponibles', 'Si activo las fotos de comidas']) assert.ok(app.includes(text), text);
  assert.doesNotMatch(app, /reportes descargables|semana a semana/);
});

test('la IA y la admision son servicios separados con un CTA publico explicito', () => {
  assert.ok(ai.includes('el contacto conmigo sigue aparte'));
  assert.ok(ai.includes('asistente de admisión de esta web es gratuito'));
  assert.ok(ai.includes('ni accede a sus planes o conversaciones'));
  assert.match(ai, /data-open-assistant[^>]*>Elegir consulta o protocolo<\/button>/);
});

test('las capacidades visuales y equivalencias no prometen exactitud ni edicion del plan', () => {
  for (const text of ['porción alternativa por calorías', 'no reescribe tu plan',
    'etiqueta nutricional', 'no sustituye una báscula', 'no diagnostica']) assert.ok(ai.includes(text), text);
});

test('acceso individual, consentimiento y creditos reemplazan promesas ilimitadas', () => {
  for (const text of ['Habilito el acceso de forma individual', 'proveedores de IA',
    '50 créditos por semana', 'modo sin cifras']) assert.ok(ai.includes(text), text);
  assert.doesNotMatch(html, /24\/7|precisión clínica de IronQx|Acceso prioritario a app/);
});

test('Daniel habla en primera persona sin sugerir un equipo de atencion', () => {
  const editorial=['autoridad','calculadora','consulta','planes','entrega','filosofia','metodologia','tecnologia','ia-bot','contacto'].map(section).join('\n');
  assert.doesNotMatch(editorial,/\b(?:Separamos|entendemos|Calculamos|Cuantificamos|Definimos|Integramos|preguntamos|nosotros|nuestro equipo)\b/i);
  assert.doesNotMatch(editorial,/Daniel (?:revisa|activa|habilita|coordina|confirma)|chat con Daniel|contacto con Daniel|sus respuestas|sus comentarios/);
  for(const [id,text] of [['autoridad','Diseño y reviso tu protocolo'],['consulta','En consulta reviso tu caso'],['entrega','Calculo cada ingrediente'],['metodologia','Ajusto tu protocolo'],['tecnologia','Tus dudas y mis respuestas'],['ia-bot','Confirmo personalmente']]) assert.ok(section(id).includes(text),id);
  assert.ok(html.includes('primero reviso tu caso.'));
  assert.ok(html.includes('que adapto a tu salud y a tus objetivos.'));
});

test('las herramientas conservan su identidad y no se presentan como el medico', () => {
  assert.ok(section('autoridad').includes('Diseño y reviso tu protocolo personalmente'));
  assert.ok(ai.includes('el contacto conmigo sigue aparte'));
  assert.ok(ai.includes('Soy <strong>IronQx AI</strong>'));
  assert.ok(ai.includes('no cambia tu prescripción ni sustituye una valoración médica'));
  const assistant=fs.readFileSync(new URL('../assistant.js',import.meta.url),'utf8');
  assert.ok(assistant.includes('Hola, soy IronQx Assistant.'));
  assert.ok(assistant.includes('Daniel confirma la modalidad y disponibilidad'));
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
  assert.match(html,/\.addons-grid\s*\{[^}]*scroll-snap-type: x mandatory/);
  assert.match(html,/@media \(max-width: 1023px\) \{ \.addon-footer \{ padding-right: 48px;/);
});

test('los CTAs llevan a la IA existente y al WhatsApp personal, sin contratar automaticamente', () => {
  const cards=[...html.matchAll(/<article class="addon-card ([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
  assert.match(cards[0][2],/class="addon-cta" href="#ia-bot"/);
  assert.match(cards[1][2],/class="addon-cta" href="https:\/\/wa.me\/593963252197\?/);
  assert.ok(cards[1][2].includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(cards[1][2].includes('No normaliza el uso ni sustituye la atención especializada'));
});

test('la portada conserva su foto original y los retratos nuevos viven en presentacion y trayectoria', () => {
  for (const name of ['standing','seated']) {
    const bytes=fs.readFileSync(new URL('../images/daniel-clinical-'+name+'-v1.webp',import.meta.url));
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.ok(bytes.length<100000);
  }
  assert.match(section('hero'),/hero-main.jpeg" alt="[^"]+" loading="eager" fetchpriority="high" width="896" height="1592"/);
  assert.doesNotMatch(section('hero'),/clinical-/);
  assert.match(section('autoridad'),/standing-v1.webp" alt="[^"]+" loading="lazy" decoding="async" width="1024" height="1280"/);
  assert.match(section('filosofia'),/seated-v1.webp" alt="[^"]+" loading="lazy" decoding="async" width="1024" height="1280"/);
  assert.equal((html.match(/https:\/\/ironqx.fit\/images\/hero-main.jpeg/g)||[]).length,3);
});

test('el seguimiento no depende de la disponibilidad ni de un fallo de API', () => {
  assert.ok(html.includes('Seguimiento personalizado.<br>Disponibilidad según agenda.'));
  assert.ok(html.includes('Consulta disponibilidad'));
  assert.ok(html.includes("fetch('/api/capacity'"));
  assert.doesNotMatch(html,/\bcapacityStat\b|Limitada|Disponibilidad limitada|Capacidad de acompañamiento|Contigo|Seguimiento con Daniel/);
});

test('la franja muestra 100 transformaciones y modalidades sin cifras animadas ni atributos repetidos', () => {
  const stats=html.split('id="statsBar"')[1].split('<!-- Autoridad compacta -->')[0];
  assert.match(stats, /class="stat-number">100\+<\/strong>/);
  for(const text of ['Transformaciones acompañadas','Cuenca','Consulta presencial','Online','Protocolos a distancia']) assert.ok(stats.includes(text),text);
  assert.equal((stats.match(/class="stat-number"/g)||[]).length,3);
  assert.doesNotMatch(stats,/Individual|A medida|App \+ IA|data-count|\b0\+/);
  assert.doesNotMatch(html,/statsObserver|data-count="50"|authority-compact-card/);
});

test('la formacion y la trayectoria tienen contenidos distintos sin credenciales duplicadas', () => {
  const authority=section('autoridad'), trajectory=section('filosofia');
  for(const name of ['Universidad de Cuenca','Universidad Autónoma de Chile','Especialización por la IFBB']) {
    assert.ok(authority.includes(name)); assert.ok(!trajectory.includes(name));
  }
  assert.equal((authority.match(/class="authority-proof"/g)||[]).length,3);
  assert.doesNotMatch(authority,/App|IA|Mr\. Cuenca|authority-field-note/);
  for(const text of ['más de 10 años','Campeón Mr. Cuenca / Top 2 Mr. Ecuador','Creador y desarrollador de IRONQx App']) assert.ok(trajectory.includes(text),text);
});

test('nutricion aporta detalles practicos y la metodologia es una secuencia no interactiva', () => {
  const nutrition=section('entrega'), method=section('metodologia');
  assert.equal((nutrition.match(/class="nutrition-detail"/g)||[]).length,4);
  for(const text of ['Crudo o cocido, explícito','Productos que sí utilizas','Comidas alrededor de tu día','La ensalada también cuenta','estimaciones nutricionales']) assert.ok(nutrition.includes(text),text);
  assert.doesNotMatch(nutrition,/method-grid|nutrition-outcome|card-hover|touch-scale/);
  assert.match(method,/<ol class="method-grid reveal"/);
  assert.equal((method.match(/class="method-step"/g)||[]).length,4);
  assert.doesNotMatch(method,/card-hover|touch-scale|method-card-bar/);
  assert.match(html,/\.nutrition-showcase \{[^}]*display: grid[^}]*letter-spacing: 0/);
  const showcaseStyle=html.match(/\.nutrition-showcase \{([^}]+)\}/)[1];
  assert.doesNotMatch(showcaseStyle,/background|border|padding/);
});

test('el carrusel conserva ambos servicios y controles separados de los planes', () => {
  assert.match(html,/id="addonsTrack" tabindex="0" role="region" aria-label="Complementos opcionales"/);
  assert.match(html,/id="addonPosition" aria-live="polite" aria-atomic="true"/);
  assert.match(html,/@media \(min-width: 768px\) \{ \.addons-grid \{[^}]*repeat\(2,minmax\(0,1fr\)\)[^}]*overflow: visible/);
  const code=html.split('// ==================== COMPLEMENTOS ====================')[1].split('// ==================== BACK TO TOP ====================')[0];
  assert.doesNotMatch(code,/scroll-dot|setInterval|touchmove/);
  assert.ok(code.includes('lucide.createElement'));
});

test('navegacion acotada, teclado, movimiento reducido y regreso a escritorio', () => {
  const code=html.split('// ==================== COMPLEMENTOS ====================')[1].split('// ==================== BACK TO TOP ====================')[0];
  const handlers={},buttons={},mobile={matches:true},reduced={matches:false};
  let scroll=0,scheduled;
  const track={scrollLeft:0,tabIndex:0,querySelectorAll:()=>cards,getBoundingClientRect:()=>({left:0,width:350}),
    addEventListener:(name,callback)=>handlers[name]=callback,
    scrollTo:options=>{track.lastOptions=options;scroll=Math.max(0,Math.min(318,options.left));track.scrollLeft=scroll;handlers.scroll();}};
  const cards=[0,342].map(left=>({getBoundingClientRect:()=>({left:left-scroll,width:326})}));
  for(const id of ['addonPrevious','addonNext','addonPosition'])buttons[id]={addEventListener:(name,callback)=>handlers[id+name]=callback};
  const document={getElementById:id=>id==='addonsTrack'?track:buttons[id],addEventListener:()=>{}};
  vm.runInNewContext(code,{document,window:{addEventListener:(name,callback)=>handlers[name]=callback},matchMedia:q=>q.includes('reduce')?reduced:mobile,requestAnimationFrame:callback=>{scheduled=callback;return 1;}});
  const flush=()=>{const callback=scheduled;scheduled=null;callback?.();};
  flush();assert.equal(buttons.addonPrevious.disabled,true);assert.equal(buttons.addonNext.disabled,false);
  handlers.addonNextclick();flush();assert.equal(buttons.addonPosition.textContent,'2 / 2');assert.equal(buttons.addonNext.disabled,true);
  reduced.matches=true;
  const event={target:track,key:'Home',preventDefault:()=>event.prevented=true};
  handlers.keydown(event);flush();assert.equal(event.prevented,true);assert.equal(track.lastOptions.behavior,'auto');assert.equal(scroll,0);
  handlers.keydown({...event,key:'End'});flush();assert.equal(scroll,318);
  mobile.matches=false;handlers.resize();flush();assert.equal(track.tabIndex,-1);assert.equal(buttons.addonPosition.textContent,'1 / 2');
});
