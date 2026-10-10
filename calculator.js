(() => {
  'use strict';

  const GOALS = {
    lose: { multiplier: 0.80, label: 'Definición · inicio al −20%' },
    recomp: { multiplier: 0.875, label: 'Recomposición · inicio al −12,5%' },
    maintain: { multiplier: 1, label: 'Mantenimiento' },
    gain: { multiplier: 1.075, label: 'Ganancia controlada · inicio al +7,5%' },
    performance: { multiplier: 1, label: 'Rendimiento · mantenimiento inicial' },
    metabolic: { multiplier: 1, label: 'Salud metabólica · mantenimiento inicial' }
  };

  // Compendium of Physical Activities: el costo neto descuenta el MET de reposo.
  const INTENSITY = {
    light: { met: 3.5, label: 'ligera' },
    moderate: { met: 5, label: 'moderada' },
    vigorous: { met: 7, label: 'alta' }
  };

  const LIMITS = {
    weight: [30, 300, 'Peso entre 30 y 300 kg.'],
    height: [120, 230, 'Altura entre 120 y 230 cm.'],
    age: [16, 90, 'Edad entre 16 y 90 años.'],
    sessions: [0, 14, 'Entre 0 y 14 sesiones.'],
    minutes: [0, 240, 'Entre 0 y 240 minutos.'],
    bodyFat: [3, 60, 'El % de grasa debe estar entre 3 y 60.']
  };

  const MIN_CARBS = 50;

  function validate(input) {
    const errors = {};
    for (const [key, [min, max, message]] of Object.entries(LIMITS)) {
      if (key === 'bodyFat' && input.bodyFat === null) continue;
      const value = input[key];
      if (!Number.isFinite(value) || value < min || value > max) errors[key] = message;
    }
    if (!GOALS[input.goal]) errors.goal = 'Elige un objetivo.';
    if (!INTENSITY[input.intensity]) errors.intensity = 'Elige una intensidad.';
    if (!(input.activity >= 1.2 && input.activity <= 1.7)) errors.activity = 'Elige tu actividad cotidiana.';
    return errors;
  }

  function bmiCategory(bmi) {
    if (bmi < 18.5) return { label: 'Rango bajo', color: '#3b82f6' };
    if (bmi < 25) return { label: 'Rango habitual', color: '#22c55e' };
    if (bmi < 30) return { label: 'Rango elevado', color: '#eab308' };
    return { label: 'Rango muy elevado', color: '#ef4444' };
  }

  function ffmiCategory(ffmiNorm, sex) {
    const thresholds = sex === 'male' ? [18, 20, 22, 25] : [14, 16, 18, 21];
    const labels = ['Bajo', 'Medio', 'Alto', 'Muy alto', 'Extremo'];
    const colors = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444'];
    let segment = thresholds.findIndex(limit => ffmiNorm < limit) + 1;
    if (segment === 0) segment = 5;
    return { segment, label: labels[segment - 1], color: colors[segment - 1] };
  }

  function estimate(input) {
    const { weight, height, age, sex, activity, sessions, minutes, goal, bodyFat } = input;
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);

    // Mifflin–St Jeor. El PAL describe la vida diaria; el entrenamiento se suma aparte.
    const bmr = (10 * weight) + (6.25 * height) - (5 * age) + (sex === 'male' ? 5 : -161);
    const met = INTENSITY[input.intensity].met;
    const trainingDaily = (met - 1) * 3.5 * weight / 200 * minutes * sessions / 7;
    const tdee = Math.round((bmr * activity) + trainingDaily);

    // Sin supervisión no inicio por debajo del basal ni de 1.200/1.500 kcal.
    const goalConfig = GOALS[goal];
    const floor = Math.max(Math.round(bmr), sex === 'male' ? 1500 : 1200);
    let target = Math.round(tdee * goalConfig.multiplier);
    const floored = goalConfig.multiplier < 1 && target < floor;
    if (floored) target = Math.min(floor, tdee);

    const leanMass = bodyFat === null ? null : weight * (1 - bodyFat / 100);
    const referenceMass = leanMass || (bmi >= 30 ? 25 * heightM * heightM : weight);
    let proteinFactor;
    let fats;

    if (goal === 'lose') {
      proteinFactor = leanMass ? 2.75 : 2.0;
      fats = Math.max(50, 0.7 * weight);
    } else if (goal === 'recomp') {
      proteinFactor = leanMass ? 2.6 : 1.9;
      fats = 0.9 * weight;
    } else if (goal === 'gain') {
      proteinFactor = leanMass ? 2.0 : 1.8;
      fats = (target * 0.275) / 9;
    } else if (goal === 'performance') {
      proteinFactor = leanMass ? 2.2 : 1.8;
      fats = (target * 0.25) / 9;
    } else if (goal === 'metabolic') {
      proteinFactor = leanMass ? 2.0 : 1.8;
      fats = (target * 0.30) / 9;
    } else {
      proteinFactor = leanMass ? 2.2 : 1.8;
      fats = (target * 0.275) / 9;
    }

    const protein = Math.round(referenceMass * proteinFactor);
    // Si proteína y grasa dejan muy pocos carbohidratos, la grasa cede hasta su mínimo.
    const fatMin = Math.max(40, 0.5 * weight);
    if ((target - protein * 4 - fats * 9) / 4 < MIN_CARBS) {
      fats = Math.max(fatMin, (target - protein * 4 - MIN_CARBS * 4) / 9);
    }
    fats = Math.round(fats);
    const carbs = Math.max(0, Math.round((target - protein * 4 - fats * 9) / 4));
    const macroKcal = protein * 4 + carbs * 4 + fats * 9;

    let ffmi = null;
    if (leanMass !== null) {
      const ffmiNorm = leanMass / (heightM * heightM) + 6.1 * (1.8 - heightM);
      ffmi = { value: ffmiNorm, ...ffmiCategory(ffmiNorm, sex) };
    }

    return {
      bmi,
      bmiCategory: bmiCategory(bmi),
      // Escala visual de 15 a 40 de IMC.
      bmiPosition: Math.min(100, Math.max(0, (bmi - 15) / 25 * 100)),
      bmr: Math.round(bmr),
      trainingDaily: Math.round(trainingDaily),
      met,
      intensityLabel: INTENSITY[input.intensity].label,
      tdee,
      goalLabel: goalConfig.label,
      target,
      floored,
      protein,
      carbs,
      fats,
      proteinPerKg: protein / weight,
      macroPct: {
        protein: Math.round(protein * 4 / macroKcal * 100),
        carbs: Math.round(carbs * 4 / macroKcal * 100),
        fats: Math.round(fats * 9 / macroKcal * 100)
      },
      ffmi
    };
  }

  function recommendPlan(input) {
    if (input.hasPatologia || input.needsSupervision) {
      return {
        name: 'Restore',
        price: '$100/mes',
        reason: 'Por la necesidad de contexto médico, Restore es la ruta prudente: seguimiento médico, nutrición adaptada y dos sesiones 1 a 1 por semana. La admisión confirma si el alcance es adecuado para tu caso.'
      };
    }
    if (input.wantsCompetir || (input.hasExperiencia && ['gain', 'performance'].includes(input.goal)) || input.sessions >= 5) {
      return {
        name: 'Forged',
        price: '$75/mes',
        reason: 'Tu frecuencia u objetivo requiere una progresión más vigilada. Forged integra periodización, control semanal y una sesión presencial 1 a 1 por semana.'
      };
    }
    return {
      name: 'Balance',
      price: '$60/mes',
      reason: 'Balance ofrece la estructura completa para avanzar con autonomía: nutrición, entrenamiento interactivo, app y control quincenal, sin sesiones presenciales 1 a 1.'
    };
  }

  globalThis.IronQxCalculator = { estimate, validate, recommendPlan };

  if (typeof document === 'undefined') return;
  const form = document.getElementById('calcForm');
  const calcResults = document.getElementById('calcResults');
  if (!form || !calcResults) return;

  const $ = id => document.getElementById(id);
  const FIELDS = {
    weight: 'calcWeight', height: 'calcHeight', age: 'calcAge', activity: 'calcActivity',
    sessions: 'calcSessions', minutes: 'calcMinutes', intensity: 'calcIntensity',
    goal: 'calcGoal', bodyFat: 'calcBodyFat'
  };
  const fmt = value => value.toLocaleString('es-EC');
  let hasResult = false;

  function readInput() {
    const number = id => parseFloat($(id).value.replace(',', '.'));
    const bodyFatInput = $('calcBodyFat').value.trim();
    return {
      weight: number('calcWeight'),
      height: number('calcHeight'),
      age: number('calcAge'),
      sex: $('calcGender').value,
      activity: parseFloat($('calcActivity').value),
      sessions: parseInt($('calcSessions').value, 10),
      minutes: number('calcMinutes'),
      intensity: $('calcIntensity').value,
      goal: $('calcGoal').value,
      bodyFat: bodyFatInput ? parseFloat(bodyFatInput.replace(',', '.')) : null,
      hasPatologia: $('profilePatologia').checked,
      wantsCompetir: $('profileCompetir').checked,
      needsSupervision: $('profileSupervision').checked,
      hasExperiencia: $('profileExperiencia').checked
    };
  }

  function showErrors(errors) {
    for (const [key, id] of Object.entries(FIELDS)) {
      const field = $(id);
      const errorId = id + 'Error';
      let message = $(errorId);
      if (!message) {
        message = document.createElement('span');
        message.className = 'form-error';
        message.id = errorId;
        message.hidden = true;
        field.insertAdjacentElement('afterend', message);
      }
      const describedBy = (field.getAttribute('aria-describedby') || '').split(' ').filter(token => token && token !== errorId);
      if (errors[key]) {
        message.textContent = errors[key];
        message.hidden = false;
        field.setAttribute('aria-invalid', 'true');
        describedBy.push(errorId);
      } else {
        message.hidden = true;
        field.removeAttribute('aria-invalid');
      }
      if (describedBy.length) field.setAttribute('aria-describedby', describedBy.join(' '));
      else field.removeAttribute('aria-describedby');
    }
    const summary = $('calcFormError');
    const count = Object.keys(errors).length;
    summary.hidden = count === 0;
    summary.textContent = count === 1 ? 'Revisa el dato marcado.' : 'Revisa los ' + count + ' datos marcados.';
  }

  function render(input, result) {
    const bmiBadge = $('bmiBadge');
    $('bmiValue').textContent = result.bmi.toFixed(1);
    bmiBadge.textContent = result.bmiCategory.label;
    bmiBadge.style.borderColor = result.bmiCategory.color;
    bmiBadge.style.color = result.bmiCategory.color;
    $('bmiMarker').style.left = result.bmiPosition + '%';

    $('bmrValue').textContent = fmt(result.bmr);
    $('tdeeValue').textContent = fmt(result.tdee);
    $('trainingValue').textContent = fmt(result.trainingDaily);
    $('trainingUnit').textContent = 'kcal netas/día estimadas · intensidad ' + result.intensityLabel + ' (MET ' + String(result.met).replace('.', ',') + ')';
    $('goalLabel').textContent = result.goalLabel;
    $('targetValue').textContent = fmt(result.target);
    $('calcSafetyNote').hidden = !result.floored;

    for (const macro of ['protein', 'carbs', 'fats']) {
      $(macro + 'Val').textContent = result[macro] + ' g';
      $(macro + 'Pct').textContent = result.macroPct[macro] + '%';
      $(macro + 'Bar').style.width = result.macroPct[macro] + '%';
    }
    $('proteinPerKg').textContent = result.proteinPerKg.toFixed(1).replace('.', ',') + ' g/kg de peso corporal';

    const ffmiSection = $('ffmiSection');
    if (result.ffmi) {
      const ffmiBadge = $('ffmiBadge');
      $('ffmiValue').textContent = result.ffmi.value.toFixed(1);
      ffmiBadge.textContent = result.ffmi.label;
      ffmiBadge.style.borderColor = result.ffmi.color;
      ffmiBadge.style.color = result.ffmi.color;
      for (let i = 1; i <= 5; i++) $('ffmiSeg' + i).style.opacity = i === result.ffmi.segment ? '1' : '0.3';
      ffmiSection.style.display = 'block';
    } else {
      ffmiSection.style.display = 'none';
    }

    const plan = recommendPlan(input);
    const message = 'Hola, hice la estimación inicial (' + result.goalLabel + ': ' + result.target + ' kcal; P ' + result.protein +
      ' g · C ' + result.carbs + ' g · G ' + result.fats + ' g) y quiero aplicar al plan ' + plan.name.toUpperCase() + '.';
    $('recPlanName').textContent = plan.name;
    $('recPlanPrice').textContent = plan.price;
    $('recPlanReason').textContent = plan.reason;
    $('recPlanCtaText').textContent = 'Aplicar a ' + plan.name;
    $('recPlanCta').href = 'https://wa.me/593963252197?text=' + encodeURIComponent(message);
    $('planRecommendation').style.display = 'block';

    calcResults.classList.remove('results-hidden');
    calcResults.classList.add('results-visible');
  }

  function calculate({ scroll }) {
    const input = readInput();
    const errors = validate(input);
    showErrors(errors);
    if (Object.keys(errors).length) {
      if (scroll) $(FIELDS[Object.keys(errors)[0]]).focus();
      return;
    }
    render(input, estimate(input));
    hasResult = true;
    if (scroll && window.innerWidth < 1024) {
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      calcResults.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    calculate({ scroll: true });
  });
  // Tras el primer cálculo, los resultados siguen a cada cambio sin mover la página.
  form.addEventListener('change', () => { if (hasResult) calculate({ scroll: false }); });
})();
