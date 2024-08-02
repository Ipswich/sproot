import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";


import Root from "./routes/Root";
import ErrorPage from "./error_pages/ErrorPage";

import { outputChartDataLoader, rootLoader, sensorChartDataLoader } from "./routes/utility/Loaders";

import CurrentConditionsChart from "./routes/CurrentConditionsChart";
import OutputStateChart from "./routes/OutputStatesChart";
import OutputSettings from "./settings/outputs/OutputSettings";
import SensorSettings from "./settings/sensors/SensorSettings";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    loader: rootLoader,
    children: [
      {
        path: "/current-conditions/:readingType",
        element: <CurrentConditionsChart />,
        
        loader: sensorChartDataLoader
      },
      {
        path: "/output-states",
        element: <OutputStateChart />,
        loader: outputChartDataLoader
      },
      {
        path: "/settings/outputs",
        element: <OutputSettings />
      },
      {
        path: "/settings/sensors",
        element: <SensorSettings />
      }]
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
