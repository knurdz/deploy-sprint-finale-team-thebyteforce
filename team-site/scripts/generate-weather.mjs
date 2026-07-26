/**
 * T07 - OpenWeather API Widget
 *
 * Fetches the current weather SERVER-SIDE at build time and writes it to
 * dist/api/weather (an extensionless JSON file that nginx serves as the
 * /api/weather endpoint, the same way T01 serves /status and /health).
 *
 * The OPENWEATHER_API_KEY is read from the environment (a GitHub Actions secret
 * in CI). It is used only here, at build time, and is never written to any file
 * or shipped to the browser - the browser only ever fetches the generated
 * /api/weather. That is why keyExposed stays false.
 *
 * If no key is available (local build, or the secret is not set yet) the script
 * still writes the provider evidence without live data, so the build never fails
 * and main stays green.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distApiDir = fileURLToPath(new URL('../dist/api', import.meta.url));

const city = process.env.OPENWEATHER_CITY || 'Colombo';
const apiKey = process.env.OPENWEATHER_API_KEY || '';

// Base status object (from the T07 snippet). provider is openweather and
// keyExposed is false because the key never leaves this server-side script.
const weatherStatus = {
  task: 'T07',
  weather: {
    provider: 'openweather',
    city,
    live: false,
  },
  keyExposed: false,
  source:
    'Fetched server-side at build time; OPENWEATHER_API_KEY never reaches the browser.',
  generatedAt: new Date().toISOString(),
};

async function fetchWeather() {
  const url =
    'https://api.openweathermap.org/data/2.5/weather' +
    `?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenWeather responded ${res.status}`);
  }
  const data = await res.json();
  return {
    temperatureC: Math.round(data.main?.temp),
    condition: data.weather?.[0]?.description ?? 'unknown',
    icon: data.weather?.[0]?.icon ?? null,
    observedAt: new Date((data.dt ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
  };
}

if (apiKey) {
  try {
    const live = await fetchWeather();
    weatherStatus.weather = { ...weatherStatus.weather, ...live, live: true };
    console.log(`T07: fetched live weather for ${city} (${live.temperatureC}C, ${live.condition}).`);
  } catch (error) {
    weatherStatus.note = `Live fetch failed (${error.message}); provider evidence still written.`;
    console.warn(`T07: ${weatherStatus.note}`);
  }
} else {
  weatherStatus.note =
    'OPENWEATHER_API_KEY not set at build time; wrote provider evidence without live data.';
  console.warn(`T07: ${weatherStatus.note}`);
}

await mkdir(distApiDir, { recursive: true });
await writeFile(
  path.join(distApiDir, 'weather'),
  `${JSON.stringify(weatherStatus, null, 2)}\n`,
  'utf8',
);
console.log('T07: wrote /api/weather (provider=openweather, keyExposed=false).');
