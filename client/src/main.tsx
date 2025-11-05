import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  redirect,
  LoaderFunctionArgs,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import Root from "./routes/Root";
import ErrorPage from "./error_pages/ErrorPage";

import { rootLoader } from "./routes/utility/Loaders";

import LiveView from "./routes/live-view/LiveView";
import SensorData from "./routes/sensor-data/SensorData";
import OutputStates from "./routes/output-states/OutputStates";
import Automations from "./routes/automations/Automations";
import OutputSettings from "./routes/settings/outputs/OutputSettings";
import SensorSettings from "./routes/settings/sensors/SensorSettings";
import SystemSettings from "./routes/settings/system/SystemSettings";
import CameraSettings from "./routes/settings/camera/CameraSettings";
import HomeRouter from "./routes/HomeRouter";
import SubcontrollerSettings from "./routes/settings/subcontrollers/SubcontrollerSettings";

// Create loader functions with fallback logic
const liveViewLoader = async () => {
  const { cameraSettings } = await rootLoader();
  // If the camera isn't enabled, redirect to the temperature sensor data page
  if (!cameraSettings?.enabled) {
    return redirect("/sensor-data/temperature");
  }
  return { cameraSettings };
};

const sensorDataPageLoader = async ({ params }: LoaderFunctionArgs) => {
  const readingType = params["readingType"] || "";
  const { readingTypes } = await rootLoader();
  const availableReadingTypes = Object.keys(readingTypes || {});

  // No reading types available, redirect to outputs
  if (availableReadingTypes.length === 0) {
    return redirect("/output-states");
  }

  // If the reading type is not available, redirect to the first available reading type
  if (!availableReadingTypes.includes(readingType)) {
    return redirect("/sensor-data/" + availableReadingTypes[0]);
  }

  return readingType;
};

const outputStatesLoader = async () => {
  const { outputs } = await rootLoader();
  if (Object.keys(outputs || {}).length === 0) {
    // No outputs available, redirect to settings
    return redirect("/settings/sensors");
  }

  return { outputs };
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    loader: rootLoader,
    children: [
      {
        path: "/",
        element: <HomeRouter />,
        loader: rootLoader,
      },
      {
        path: "/live-view",
        element: <LiveView />,
        loader: liveViewLoader,
      },
      {
        path: "/sensor-data/:readingType",
        element: <SensorData />,
        loader: sensorDataPageLoader,
      },
      {
        path: "/output-states",
        element: <OutputStates />,
        loader: outputStatesLoader,
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
        path: "/settings/camera",
        element: <CameraSettings />,
      },
      { path: "/settings/subcontrollers", element: <SubcontrollerSettings /> },
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
