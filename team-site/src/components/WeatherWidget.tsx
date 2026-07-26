import { useEffect, useState } from 'react';
import { CloudSun } from 'lucide-react';

type Weather = {
  provider: string;
  city: string;
  live?: boolean;
  temperatureC?: number;
  condition?: string;
};

type WeatherPayload = {
  weather?: Weather;
};

// The widget only ever reads the public /api/weather endpoint that CI generated
// at build time. It never sees the OpenWeather API key.
export function WeatherWidget() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/weather')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }
        return res.json() as Promise<WeatherPayload>;
      })
      .then((data) => {
        if (active) {
          setWeather(data.weather ?? null);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const hasLive =
    weather?.live === true && typeof weather.temperatureC === 'number';

  return (
    <div className="weatherWidget">
      <CloudSun size={18} />
      <div>
        <strong>Weather · {weather?.city ?? 'Colombo'}</strong>
        {hasLive ? (
          <span>
            {weather?.temperatureC}°C · {weather?.condition}
          </span>
        ) : (
          <span>{failed ? 'Weather unavailable' : 'Live data pending API key'}</span>
        )}
      </div>
    </div>
  );
}
