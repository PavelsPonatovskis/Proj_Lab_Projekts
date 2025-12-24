import React, { useEffect, useState } from "react";
import "./WeatherWidget.css";

const WEATHER_CODES = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  61: "Rain",
  71: "Snow",
  80: "Rain showers",
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=56.9496&longitude=24.1052&current_weather=true&windspeed_unit=kmh"
    )
      .then((res) => res.json())
      .then((data) => {
        setWeather(data.current_weather);
      })
      .catch(() => {});
  }, []);

  if (!weather) {
    return <div className="weather-card">Loading weather...</div>;
  }

  return (
    <div className="weather-card">
      <div className="weather-title">📍 Riga weather</div>
      <div className="weather-temp">{weather.temperature}°C</div>
      <div className="weather-desc">
        {WEATHER_CODES[weather.weathercode] || "Weather"}
      </div>
      <div className="weather-wind">💨 {weather.windspeed} km/h wind</div>
    </div>
  );
}
