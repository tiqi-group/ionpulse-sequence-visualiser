import { render, screen } from "@testing-library/react";
import { test, expect, vi, afterEach } from "vitest";

import App from "./App";

test("renders title", () => {
  afterEach(() => {
    window.URL.createObjectURL.mockReset();
  });
  render(<App />);
  const linkElement = screen.getByText(/Sequence Visualizer/i);
  expect(linkElement).toBeDefined();
});
