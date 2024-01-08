import { ChartData } from "@sproot/src/api/ChartData";
import { ReadingType } from "@sproot/src/sensors/SensorBase";
import {
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  ResponsiveContainer,
} from "recharts";

interface ChartProps {
  width: number;
  height: number;
  readingType: ReadingType;
  chartData: Record<ReadingType, ChartData[]>;
  sensorNames: string[];
}

export default function Chart({
  readingType,
  chartData,
  sensorNames,
}: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={chartData[readingType as ReadingType]!}
        margin={{
          top: 5,
          right: 50,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis domain={["auto", "auto"]} />
        <Tooltip />
        <Legend />
        {sensorNames.map((sensorName) => (
          <Line
            key={sensorName}
            type="monotone"
            dataKey={sensorName}
            stroke="#8884d8"
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
