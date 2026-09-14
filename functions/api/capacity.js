const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
  'X-Content-Type-Options': 'nosniff'
};

function ecuadorDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

export async function onRequestGet({ env }) {
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const coachEmail = env.IRONQX_COACH_EMAIL;
  const capacity = Math.max(1, Number.parseInt(env.IRONQX_CAPACITY || '20', 10));

  if (!supabaseUrl || !serviceKey || !coachEmail) {
    return new Response(JSON.stringify({ error: 'capacity_not_configured' }), {
      status: 503,
      headers: JSON_HEADERS
    });
  }

  try {
    const endpoint = new URL('/rest/v1/patients', supabaseUrl);
    endpoint.searchParams.set('select', 'exp_date');
    endpoint.searchParams.set('coach_email', `eq.${coachEmail}`);

    const upstream = await fetch(endpoint.toString(), {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: 'application/json'
      }
    });
    if (!upstream.ok) throw new Error(`Supabase ${upstream.status}`);

    const patients = await upstream.json();
    const today = ecuadorDate();
    const active = patients.reduce((count, patient) => {
      const expiry = patient.exp_date ? String(patient.exp_date).slice(0, 10) : null;
      return count + (!expiry || expiry >= today ? 1 : 0);
    }, 0);

    return new Response(JSON.stringify({
      active,
      total: patients.length,
      capacity,
      available: Math.max(0, capacity - active),
      updatedAt: new Date().toISOString()
    }), { status: 200, headers: JSON_HEADERS });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'capacity_unavailable' }), {
      status: 503,
      headers: JSON_HEADERS
    });
  }
}
