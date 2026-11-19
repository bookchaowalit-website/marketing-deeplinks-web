// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { SEED, STORAGE_KEY } from "@/lib/deeplinks";

// Mounted tests for Deep Links on the App shell: lists, composer, copy, remove + undo and the two empty states.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const $ = (selector: string) => host.querySelector(selector) as HTMLElement | null;
const button = (text: string) => [...host.querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") ?? b.textContent?.trim())?.startsWith(text)) as HTMLButtonElement;
const press = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
const rows = () => [...host.querySelectorAll(".as-row h3")].map((h) => h.textContent);
const mount = () => act(() => root.render(<Home />));
const type = (input: HTMLInputElement, value: string) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
const field = (label: string) => [...host.querySelectorAll("label")].find((l) => l.textContent?.startsWith(label))?.querySelector("input") as HTMLInputElement;

beforeEach(() => {
  window.localStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("deep links", () => {
  it("server-renders the seed links, the honest note and the hub link", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("All links");
    expect(html).toContain("app://projects/{id}");
    expect(html).toContain("not a live app router");
    expect(html).toContain('href="https://bookchaowalit.com/"');
  });

  it("filters by state and says when a list is empty", () => {
    mount();
    expect(rows()).toEqual(["Open project", "Share note"]);
    press(button("Draft"));
    expect($("h1")?.textContent).toBe("Draft");
    expect(rows()).toEqual(["Share note"]);
    press(button("Done"));
    expect($(".as-empty")?.textContent).toContain("This list is empty");
  });

  it("adds a link from the composer, with Add explained while a field is empty", () => {
    mount();
    press(button("Done"));
    press(button("New link"));
    expect(document.activeElement).toBe(field("Name"));
    expect(button("Add").disabled).toBe(true);
    expect($("#add-hint")?.textContent).toBe("Add needs a name and a URL.");
    type(field("Name"), "Profile");
    type(field("Deep link URL"), "app://me");
    expect($("#add-hint")).toBeNull();
    press([...host.querySelectorAll(".as-segmented button")].find((b) => b.textContent === "Active") as HTMLButtonElement);
    act(() => { ($("form.as-composer") as HTMLFormElement).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect($("h1")?.textContent).toBe("Active");
    expect(rows()[0]).toBe("Profile");
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")).toHaveLength(3);
    press(button("New link"));
    press(button("Cancel"));
    expect($("form.as-composer")).toBeNull();
  });

  it("copies a URL and reports a failed copy", async () => {
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("blocked"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    mount();
    await act(async () => { button("Copy URL of Open project").click(); });
    expect(writeText).toHaveBeenCalledWith("app://projects/{id}");
    expect(button("Copied Open project").textContent).toBe("Copied");
    await act(async () => { button("Copy URL of Share note").click(); });
    expect($('[role="status"]')?.textContent).toBe("Copy failed: select the URL and copy it by hand.");
  });

  it("removes with an Undo toast that puts the link back in place", () => {
    vi.useFakeTimers();
    mount();
    press(button("Remove Open project"));
    expect(rows()).toEqual(["Share note"]);
    press(button("Undo remove"));
    expect(rows()).toEqual(["Open project", "Share note"]);
    press(button("Remove Share note"));
    act(() => { vi.advanceTimersByTime(6000); });
    expect($(".as-toast")).toBeNull();
  });

  it("tells an empty registry from a search with no match", () => {
    window.localStorage.setItem(STORAGE_KEY, "[]");
    mount();
    expect($(".as-empty")?.textContent).toContain("No links yet");
    press(button("Restore examples"));
    expect(rows()).toHaveLength(SEED.length);
    type(host.querySelector('input[type="search"]') as HTMLInputElement, "zzz");
    expect($(".as-empty")?.textContent).toContain("Nothing matches");
    press(button("Clear search"));
    expect(rows()).toHaveLength(2);
  });
});
