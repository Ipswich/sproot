import { ReadingType, ISensorBase } from "@sproot/src/sensors/SensorBase";

interface TableProps {
  readingType: ReadingType;
  sensors: Record<string, ISensorBase>;
}

export default function Table({ readingType, sensors }: TableProps) {
  return (
    <table style={{ marginLeft: "auto", marginRight: "auto", width: "100%", height: "100%"}}>
      <thead>
        <tr>
          <th>Sensor</th>
          <th>{readingType.charAt(0).toUpperCase() +
                        readingType.slice(1)}</th>
        </tr>
      </thead>
      <tbody>
        {Object.values(sensors)
          .filter((sensor) =>
            Object.keys(sensor.lastReading).includes(readingType),
          )
          .map((sensor) => (
            <tr key={sensor.id}>
              <td>{sensor.name}</td>
              <td>{`${sensor.lastReading[readingType]} ${sensor.units[readingType]}`}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
