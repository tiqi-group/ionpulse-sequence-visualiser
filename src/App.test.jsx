import { expect, test, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
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

test("Plot page renders", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/plot"]}>
      <App />
    </MemoryRouter>,
  );
  const butt = screen.getByText("Channels");
  expect(butt).toBeDefined();

  expect(screen.queryByText("Channels to display")).toBeNull();
  await user.click(butt);
  expect(screen.getByText("Channels to display")).toBeVisible();
  const rf0_enable = screen.getByLabelText("397", { selector: "input" });
  await user.click(rf0_enable);
  await user.click(screen.getByText("Channels"));
  expect(screen.getByText("397")).toBeVisible();
});
