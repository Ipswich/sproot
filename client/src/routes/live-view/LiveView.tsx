import { Fragment } from "react";
import ImageOrVideoDisplay from "./components/ImageOrVideoDisplay";
import TimelapseDetails from "./components/TimelapseDetails";

export default function LiveView() {
  return (
    <Fragment>
      <ImageOrVideoDisplay />
      <br />
      <TimelapseDetails />
    </Fragment>
  );
}
