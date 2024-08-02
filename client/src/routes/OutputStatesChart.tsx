import { useLoaderData } from "react-router-dom"

import { ChartSeries, DataSeries } from "@sproot/sproot-common/dist/utility/ChartData";

export default function OutputStateChart() {
  const {data} = useLoaderData() as {
    data: DataSeries[],
    series: ChartSeries[]
  };
  
  console.log(data)
  return (
    <div>
      <p>Colors: {}</p>
    </div>
  );
}