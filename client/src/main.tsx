import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import Root from "./routes/Root";
import ErrorPage from "./error_pages/ErrorPage";

import { rootLoader, sensorChartDataLoader } from "./routes/utility/Loaders";

import Dashboard from "./routes/Dashboard";
import SensorData from "./routes/sensor-data/SensorData";
import OutputStates from "./routes/output-states/OutputStates";
import Automations from "./routes/automations/Automations";
import OutputSettings from "./routes/settings/outputs/OutputSettings";
import SensorSettings from "./routes/settings/sensors/SensorSettings";
import SystemSettings from "./routes/settings/system/SystemSettings";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    loader: rootLoader,
    children: [
      {
        path: "/",
        element: <Dashboard />,
      },
      {
        path: "/sensor-data/:readingType",
        element: <SensorData />,
        loader: sensorChartDataLoader,
      },
      {
        path: "/output-states",
        element: <OutputStates />,
      },
      {
        path: "/automations",
        element: <Automations />,
      },
      {
        path: "/settings/outputs",
        element: <OutputSettings />,
      },
      {
        path: "/settings/sensors",
        element: <SensorSettings />,
      },
      {
        path: "/settings/system",
        element: <SystemSettings />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
      {import.meta.env["VITE_ENV"] === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  </React.StrictMode>,
);
