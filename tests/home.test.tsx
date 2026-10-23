import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("renders the seed registry and the local-only notice", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("path a pulse.");
    expect(html).toContain("app://projects/{id}");
    expect(html).toContain("Share note");
    expect(html).toContain("The linework is a preview, not a live app router.");
  });
});
