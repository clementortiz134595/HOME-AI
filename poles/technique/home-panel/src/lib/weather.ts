export type WeatherReport = {
  location: { name: string; timezone: string };
  current: {
    observedAt: string;
    temperatureCelsius: number;
    apparentCelsius: number;
    weatherCode: number;
    summary: string;
    humidityPercent?: number;
    pressureHPa?: number;
    windSpeedKmh?: number;
  };
  daily: { date: string; minimumCelsius: number; maximumCelsius: number; precipitationProbabilityPercent?: number; summary: string }[];
  hourly: { forecastAt: string; temperatureCelsius?: number; precipitationProbabilityPercent?: number; windSpeedKmh?: number; summary: string }[];
};

export async function getWeather(signal?: AbortSignal): Promise<WeatherReport> {
  const response = await fetch("/v1/weather/la-ciotat", { signal });
  if (!response.ok) throw new Error("weather_unavailable");
  return response.json() as Promise<WeatherReport>;
}
