import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { expect, test, beforeEach, afterEach } from "vitest";
import { MemoryRouter, BrowserRouter } from "react-router-dom";

import App from "./App";

afterEach(() => {
  cleanup();
  window.URL.createObjectURL.mockReset();
});

test("Root page renders title", () => {
  render(<App />, { wrapper: BrowserRouter });
  const linkElement = screen.getByText(/Sequence Visualizer/i);
  expect(linkElement).toBeDefined();
});

test("Hardware page displays AOM information", () => {
  render(
    <MemoryRouter initialEntries={["/hardware"]}>
      <App />
    </MemoryRouter>,
  );
  const element = screen.getAllByText(/Central frequency:/i);
  expect(element).toBeDefined();
});

test("Plot page renders", () => {
  render(
    <MemoryRouter initialEntries={["/plot"]}>
      <App />
    </MemoryRouter>,
  );
  // Can't test plotly because it uses canvas (svg would be better)
  // expect(screen.getByText(/RF0/i)).toBeDefined();
  // expect(screen.getByText(/TTL0/i)).toBeDefined();
  const butt = screen.getByText("Channels");
  expect(butt).toBeDefined();

  expect(screen.queryByText(/Channels to display/)).toBeNull();
  fireEvent.click(butt);
  expect(screen.getByText(/Channels to display/)).toBeDefined();
  const rf0_enable = screen.getByText("RF0");
  // console.log(rf0_enable)
  expect(rf0_enable.ariaPressed).toBe("true");
  fireEvent.click(screen.getByText("RF0"));
  expect(rf0_enable.ariaPressed).toBe("false");
  fireEvent.click(screen.getByText("RF0"));
  expect(rf0_enable.ariaPressed).toBe("true");
});
