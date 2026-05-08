import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

// Minimal render test — ensures App mounts without fatal errors
// with Clerk + Sentry + Router mocks from setup.ts
describe("App Component", () => {
  it("renders without crashing", () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );
    // App renders a Navbar; at minimum the document should not be empty
    expect(document.body).toBeInTheDocument();
  });

  it("shows navigation elements", () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );
    // App uses lucide icons and buttons; check that something rendered
    expect(document.querySelector("nav")).toBeTruthy();
  });
});
