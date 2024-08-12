import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import Root from "./routes/Root";
import ErrorPage from "./error_pages/ErrorPage";

import { rootLoader, sensorChartDataLoader } from "./routes/utility/Loaders";

import CurrentConditions from "./routes/current-conditions/CurrentConditions";
import OutputStates from "./routes/output-states/OutputStates";
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
        element: <CurrentConditions />,
        loader: sensorChartDataLoader,
      },
      {
        path: "/output-states",
        element: <OutputStates />,
      },
      {
        path: "/settings/outputs",
        element: <OutputSettings />,
      },
      {
        path: "/settings/sensors",
        element: <SensorSettings />,
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
