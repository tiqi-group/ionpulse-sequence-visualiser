// Whether the visualizer runs embedded in another application (e.g. inside
// ICON's iframe, which appends ?embedded=1). In embedded mode the hosting
// application configures the endpoint, so the Configure tab and the header
// branding are hidden.
export const isEmbedded =
  new URLSearchParams(window.location.search).get("embedded") === "1";
