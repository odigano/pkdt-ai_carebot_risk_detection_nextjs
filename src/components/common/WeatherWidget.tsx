"use client";
import { useEffect, useState } from "react";

interface WeatherData {
  temp: number;
  feelsLike: number;
  condition: string;
  wind: string;
  humidity: number;
  rain: number;
  pm10: number | null;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeatherAndAir = async () => {
      try {
        // 🌤 1. OpenWeatherMap (날씨)
        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Daejeon,KR&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&units=metric&lang=kr`
        );
        const weatherData = await weatherRes.json();

        // 💨 2. 한국환경공단 (미세먼지)
        const airRes = await fetch(
          `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?serviceKey=${process.env.NEXT_PUBLIC_AIR_API_KEY}&sidoName=대전&returnType=json&numOfRows=1&ver=1.3`
        );
        const airData = await airRes.json();

        const pm10 =
          airData?.response?.body?.items?.[0]?.pm10Value
            ? Number(airData.response.body.items[0].pm10Value)
            : null;

        if (weatherData?.main) {
          setWeather({
            temp: weatherData.main.temp,
            feelsLike: weatherData.main.feels_like,
            condition: weatherData.weather[0].description,
            wind: `${weatherData.wind.speed} m/s`,
            humidity: weatherData.main.humidity,
            rain: weatherData.rain ? weatherData.rain["1h"] : 0,
            pm10,
          });
        } else {
          setError("날씨 정보를 불러올 수 없습니다.");
        }
      } catch (err) {
        console.error("❌ fetch error:", err);
        setError("정보를 가져오는 중 오류가 발생했습니다.");
      }
    };
    fetchWeatherAndAir();
  }, []);

  if (error) return <div className="text-sm text-gray-600">{error}</div>;
  if (!weather) return <div className="text-sm text-gray-600">날씨 정보를 불러오는 중...</div>;

  return (
    <div className="flex items-center space-x-3 text-sm bg-gray-100 px-3 py-2 rounded-lg">
      <span>🌤 {weather.condition}</span>
      <span>{weather.temp}°C (체감 {weather.feelsLike}°C)</span>
      <span>💨 {weather.wind}</span>
      <span>💧습도 {weather.humidity}%</span>
      <span>☂ {weather.rain}%</span>
      <span>
        🌫 미세먼지{" "}
        {weather.pm10 !== null ? `${weather.pm10}㎍/㎥` : "정보 없음"}
      </span>
    </div>
  );
}
