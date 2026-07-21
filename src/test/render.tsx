import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Every page component calls useNavigate/useSmartBack, which need a Router
// context to exist at all — this is the one thing shared across every page
// test, so it's the one thing factored out.
export function renderWithRouter(ui: ReactElement) {
  return render(ui, { wrapper: MemoryRouter });
}
