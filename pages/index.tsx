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

      // If it's a log message, append it to the weatherData
      if (data.log) {
        setWeatherData(prevData => [...prevData, { log: data.log }]);
      }

      // If it's the final output, append it to the weatherData and close the connection
      if (data.output) {
        setWeatherData(prevData => [...prevData, { output: data.output }]);
        eventSource.close();
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div>
      {weatherData.map((item, index) => (
        <div key={index}>
          {item.log && <p>{item.log}</p>}
          {item.output && <p>{item.output}</p>}
        </div>
      ))}
    </div>
  );
}

