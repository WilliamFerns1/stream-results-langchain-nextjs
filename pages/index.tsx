"use client";

import { useEffect, useState } from 'react';

type WeatherData = {
  log?: string;
  output?: string;
};

export default function WeatherStream() {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);

  useEffect(() => {
    const eventSource = new EventSource('/api/weather');

    eventSource.onmessage = (event: MessageEvent) => {
      // Parse the JSON data
      const data: WeatherData = JSON.parse(event.data);
      console.log(`Data: ${JSON.stringify(data)}`);

      // Update weatherData based on the type of data received
      setWeatherData(prevWeatherData => {
        if (data.log) {
          console.log("Data Log: " + data.log);
          return [...prevWeatherData, data];
        } else if (data.output) {
          console.log("Output Log: " + data.output);
          eventSource.close();
          return [...prevWeatherData, data];
        }
        return prevWeatherData;
      });
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div>
      {weatherData.map((item, index) => (
        <p key={index}>{item.log || item.output}</p>
      ))}
    </div>
  );
}

