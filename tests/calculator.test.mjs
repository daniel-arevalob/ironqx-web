import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const js = read('calculator.js'), html = read('index.html');
const context = {};
vm.runInNewContext(js, context);
const { estimate, validate, recommendPlan } = context.IronQxCalculator;
const base = {
  weight: 80, height: 178, age: 30, sex: 'male', activity: 1.25, sessions: 4, minutes: 60,
  intensity: 'moderate', goal: 'maintain', bodyFat: null
};

test('mantenimiento usa Mifflin-St Jeor y suma el entrenamiento aparte', () => {
  const r = estimate(base);
  assert.equal(r.bmr, 1768);
  assert.equal(r.trainingDaily, 192);
  assert.equal(r.tdee, 2401);
  assert.equal(r.target, r.tdee);
  assert.equal(r.floored, false);
});

test('la intensidad cambia el costo neto del entrenamiento', () => {
  const light = estimate({ ...base, intensity: 'light' }).trainingDaily;
  const vigorous = estimate({ ...base, intensity: 'vigorous' }).trainingDaily;
  assert.ok(light < 192 && vigorous > 192);
  assert.equal(estimate({ ...base, sessions: 0 }).trainingDaily, 0);
});

test('los macros suman las calorias objetivo en todos los objetivos', () => {
  for (const goal of ['lose', 'recomp', 'maintain', 'gain', 'performance', 'metabolic']) {
    for (const bodyFat of [null, 18]) {
      const r = estimate({ ...base, goal, bodyFat });
      assert.ok(Math.abs(r.protein * 4 + r.carbs * 4 + r.fats * 9 - r.target) <= 8, goal);
      assert.ok(r.carbs >= 45, goal);
    }
  }
});

test('el deficit nunca inicia por debajo del basal ni del minimo por sexo', () => {
  const small = { ...base, weight: 48, height: 152, age: 45, sex: 'female', sessions: 0, goal: 'lose' };
  const r = estimate(small);
  assert.equal(r.floored, true);
  assert.equal(r.target, 1200);
  assert.ok(r.target >= r.bmr);
  assert.equal(estimate({ ...base, goal: 'lose' }).floored, false);
});

test('la validacion marca cada dato fuera de rango', () => {
  assert.deepEqual(Object.keys(validate(base)), []);
  const errors = validate({ ...base, weight: NaN, age: 12, bodyFat: 70 });
  assert.deepEqual(Object.keys(errors).sort(), ['age', 'bodyFat', 'weight']);
});

test('la ruta sugerida respeta prioridad medica y frecuencia', () => {
  assert.equal(recommendPlan({ ...base, hasPatologia: true, wantsCompetir: true }).name, 'Restore');
  assert.equal(recommendPlan({ ...base, sessions: 5 }).name, 'Forged');
  assert.equal(recommendPlan(base).name, 'Balance');
});

test('la pagina carga la calculadora como formulario accesible sin alertas', () => {
  assert.match(html, /<form class="calc-card-body" id="calcForm" novalidate>/);
  assert.match(html, /<script defer src="\/calculator\.js\?v=\d+"><\/script>/);
  for (const id of ['calcWeight', 'calcHeight', 'calcAge', 'calcGender', 'calcIntensity', 'calcBodyFat']) {
    assert.match(html, new RegExp('<label class="form-label" for="' + id + '"'), id);
  }
  assert.doesNotMatch(js, /alert\(/);
});
