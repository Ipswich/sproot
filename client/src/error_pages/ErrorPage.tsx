import { useRouteError } from "react-router-dom";
import style from "./ErrorPages.module.css";

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error instanceof Error ? error.message : error);

  return (
    <div id={style["error-page"]}>
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p>
        <i>{error instanceof Error ? error.message : ""}</i>
      </p>
    </div>
  );
}