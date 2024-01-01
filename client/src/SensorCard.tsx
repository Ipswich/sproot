import {
  ISensorBase,
  ReadingType,
} from "@sproot/sproot-common/dist/sensors/SensorBase";

interface SensorCardProps {
  sensor: ISensorBase;
  updateSensorsAsync: () => Promise<void>;
}

export default function SensorCard({ sensor }: SensorCardProps) {
  return (
    <div>
      <p>Sensor Id: {sensor.id}</p>
      {sensor.description ? <p>{sensor.description}</p> : null}
      {Object.keys(sensor.lastReading).map((key) => (
        <p key={"lastReading-" + key}>
          {key}: {sensor.lastReading[key as ReadingType]}{" "}
          {sensor.units[key as ReadingType]}
        </p>
      ))}
      <br></br>
    </div>
  );
}
