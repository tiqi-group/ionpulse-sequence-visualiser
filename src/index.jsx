import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import "./App.scss";
//import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from "react-router-dom";

const getBasename = (path) => path.substr(0, path.lastIndexOf("/"));

// Theme can be forced via ?theme=dark|light (used by ICON when embedding the
// visualiser in an iframe); otherwise follow the browser preference.
const themeParam = new URLSearchParams(window.location.search).get("theme");
const theme = ["dark", "light"].includes(themeParam)
  ? themeParam
  : window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
document.documentElement.setAttribute("data-bs-theme", theme);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
      basename={getBasename(window.location.pathname)}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
//reportWebVitals();
