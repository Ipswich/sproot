import "./index.css";

import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  redirect,
  LoaderFunctionArgs,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Root from "./routes/Root";
import ErrorPage from "./error_pages/ErrorPage";

import { rootLoader } from "./routes/utility/Loaders";

import HomeRouter from "./routes/HomeRouter";
import LiveView from "./routes/live-view/LiveView";
import SensorData from "./routes/sensor-data/SensorData";
import OutputStates from "./routes/output-states/OutputStates";
import Automations from "./routes/automations/Automations";
import Journals from "./routes/journals/Journals";
import JournalEntries from "./routes/journals/entries/JournalEntries";
import JournalEntryView from "./routes/journals/entries/JournalEntryView";
import OutputSettings from "./routes/settings/outputs/OutputSettings";
import SensorSettings from "./routes/settings/sensors/SensorSettings";
import CameraSettings from "./routes/settings/camera/CameraSettings";
import SubcontrollerSettings from "./routes/settings/subcontrollers/SubcontrollerSettings";
import SystemSettings from "./routes/settings/system/SystemSettings";

const queryClient = new QueryClient();

// function RouteHydrateFallback() {
//   return (
//     <div
//       style={{
//         minHeight: 240,
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//       }}
//     >
//       <div
//         aria-label="Loading"
//         style={{ display: "flex", alignItems: "center", gap: 6 }}
//       >
//         <span
//           style={{
//             width: 8,
//             height: 20,
//             borderRadius: 999,
//             background: "#0f766e",
//             opacity: 0.45,
//             animation: "copilot-bars 0.8s ease-in-out infinite",
//           }}
//         />
//         <span
//           style={{
//             width: 8,
//             height: 28,
//             borderRadius: 999,
//             background: "#0f766e",
//             opacity: 0.75,
//             animation: "copilot-bars 0.8s ease-in-out 0.12s infinite",
//           }}
//         />
//         <span
//           style={{
//             width: 8,
//             height: 20,
//             borderRadius: 999,
//             background: "#0f766e",
//             opacity: 0.45,
//             animation: "copilot-bars 0.8s ease-in-out 0.24s infinite",
//           }}
//         />
//         <style>
//           {`@keyframes copilot-bars { 0%, 100% { transform: scaleY(0.7); opacity: 0.4; } 50% { transform: scaleY(1); opacity: 1; } }`}
//         </style>
//       </div>
//     </div>
//   );
// }

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
        loader: liveViewLoader,
        element: <LiveView />,
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
        path: "/journals",
        element: <Journals />,
      },
      {
        path: "/journals/:journalId",
        element: <JournalEntries />,
      },
      {
        path: "/journals/:journalId/entries/:entryId",
        element: <JournalEntryView />,
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
      {
        path: "/settings/subcontrollers",
        element: <SubcontrollerSettings />,
      },
      {
        path: "/settings/system",
        element: <SystemSettings />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
