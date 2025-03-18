import { vi } from "vitest";
import "vitest-canvas-mock";
import "@testing-library/jest-dom/vitest";
import failOnConsole from "vitest-fail-on-console";

failOnConsole();

window.URL.createObjectURL = vi.fn();

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock("react-transition-group", () => {
  const FakeTransition = vi.fn(({ children }) => children);
  const FakeCSSTransition = vi.fn((props) =>
    props.in ? <FakeTransition>{props.children}</FakeTransition> : null,
  );
  return { CSSTransition: FakeCSSTransition, Transition: FakeTransition };
});
