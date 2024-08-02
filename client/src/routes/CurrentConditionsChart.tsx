import { useLoaderData } from "react-router-dom"

import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { ChartSeries, DataSeries } from "@sproot/sproot-common/dist/utility/ChartData";

export default function CurrentConditionsChart() {
  const {data} = useLoaderData() as {
    data: Partial<Record<ReadingType, DataSeries>>,
    series: ChartSeries[]
  };

  const readingType = Object.keys(data)[0] as ReadingType;
  return (
    <div>
      <p>Current conditions for {readingType}</p>
      <p>Colors: {}</p>
    </div>
  );
}