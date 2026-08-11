import "./index.css";

import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  type LazyRouteFunction,
  RouterProvider,
  redirect,
  LoaderFunctionArgs,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Root from "./routes/Root";
import ErrorPage from "./error_pages/ErrorPage";

import { rootLoader } from "./routes/utility/Loaders";

import HomeRouter from "./routes/HomeRouter";

const queryClient = new QueryClient();

function RouteHydrateFallback() {
  return (
    <div
      style={{
        minHeight: 240,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#0f766e",
        fontSize: "0.95rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      Loading view...
    </div>
  );
}

function lazyRoute<TModule extends { default: React.ComponentType<any> }>(
  importer: () => Promise<TModule>,
): LazyRouteFunction<any> {
  return async () => {
    const module = await importer();
    return { Component: module.default };
  };
}

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
    Component: Root,
    errorElement: <ErrorPage />,
    HydrateFallback: RouteHydrateFallback,
    loader: rootLoader,
    children: [
      {
        path: "/",
        Component: HomeRouter,
        HydrateFallback: RouteHydrateFallback,
        loader: rootLoader,
      },
      {
        path: "/live-view",
        HydrateFallback: RouteHydrateFallback,
        loader: liveViewLoader,
        lazy: lazyRoute(() => import("./routes/live-view/LiveView")),
      },
      {
        path: "/sensor-data/:readingType",
        HydrateFallback: RouteHydrateFallback,
        loader: sensorDataPageLoader,
        lazy: lazyRoute(() => import("./routes/sensor-data/SensorData")),
      },
      {
        path: "/output-states",
        HydrateFallback: RouteHydrateFallback,
        loader: outputStatesLoader,
        lazy: lazyRoute(() => import("./routes/output-states/OutputStates")),
      },
      {
        path: "/automations",
        HydrateFallback: RouteHydrateFallback,
        lazy: lazyRoute(() => import("./routes/automations/Automations")),
      },
      {
        path: "/journals",
        HydrateFallback: RouteHydrateFallback,
        lazy: lazyRoute(() => import("./routes/journals/Journals")),
      },
      {
        path: "/journals/:journalId",
        HydrateFallback: RouteHydrateFallback,
        lazy: lazyRoute(() => import("./routes/journals/entries/JournalEntries")),
      },
      {
        path: "/journals/:journalId/entries/:entryId",
        HydrateFallback: RouteHydrateFallback,
        lazy: lazyRoute(() => import("./routes/journals/entries/JournalEntryView")),
      },
      {
        path: "/settings/outputs",
        HydrateFallback: RouteHydrateFallback,
        lazy: lazyRoute(() => import("./routes/settings/outputs/OutputSettings")),
      },
      {
        path: "/settings/sensors",
        HydrateFallback: RouteHydrateFallback,
        lazy: lazyRoute(() => import("./routes/settings/sensors/SensorSettings")),
      },
      {
        path: "/settings/camera",
        HydrateFallback: RouteHydrateFallback,
        lazy: lazyRoute(() => import("./routes/settings/camera/CameraSettings")),
      },
      {
        path: "/settings/subcontrollers",
        HydrateFallback: RouteHydrateFallback,
        lazy: lazyRoute(() => import("./routes/settings/subcontrollers/SubcontrollerSettings")),
      },
      {
        path: "/settings/system",
        HydrateFallback: RouteHydrateFallback,
        lazy: lazyRoute(() => import("./routes/settings/system/SystemSettings")),
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
