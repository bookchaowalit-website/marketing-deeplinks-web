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
// detail 0 = keyboard (Enter/Space) click, 1 = pointer click.
const press = (el: Element, detail = 1) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail })); });
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

  it("Undo puts a link back between its old neighbours even after a link was added on top meanwhile", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: "a", title: "A", url: "app://a", status: "Active", createdAt: 3 },
      { id: "b", title: "B", url: "app://b", status: "Active", createdAt: 2 },
      { id: "c", title: "C", url: "app://c", status: "Active", createdAt: 1 },
    ]));
    mount();
    press(button("Remove B"));
    press(button("New link"));
    type(field("Name"), "X");
    type(field("Deep link URL"), "app://x");
    act(() => { ($("form.as-composer") as HTMLFormElement).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    press(button("Undo remove"));
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]").map((r: { title: string }) => r.title)).toEqual(["X", "A", "B", "C"]);
  });

  it("removals inside the Undo window form one batch; Undo restores every link in place", () => {
    vi.useFakeTimers();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([
      ...SEED,
      { id: "third", title: "Third", url: "app://third", status: "Done", createdAt: 1 },
    ]));
    mount();
    const before = rows();
    expect(before).toHaveLength(3);
    press(button(`Remove ${before[1]}`));
    act(() => { vi.advanceTimersByTime(4000); });
    press(button(`Remove ${before[0]}`));
    expect(rows()).toEqual([before[2]]);
    expect($(".as-toast span")?.textContent).toBe("Removed 2 links");
    expect(button("Undo").getAttribute("aria-label")).toBe("Undo remove of 2 links");
    // The second removal restarted the 6 s window: 4 s later it is still open.
    act(() => { vi.advanceTimersByTime(4000); });
    press(button("Undo"));
    expect(rows()).toEqual(before);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")).toHaveLength(3);
    expect($('[role="status"]')?.textContent).toBe("Restored 2 links.");
    expect($(".as-toast")).toBeNull();
  });

  it("keyboard removal focuses Undo; Undo focuses the restored link, Escape the next one", () => {
    mount();
    press(button("Remove Open project"), 0);
    expect(document.activeElement).toBe(button("Undo remove"));
    press(button("Undo remove"), 0);
    expect(rows()).toEqual(["Open project", "Share note"]);
    expect(document.activeElement).toBe(button("Remove Open project"));
    press(button("Remove Open project"), 0);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect($(".as-toast")).toBeNull();
    expect(document.activeElement).toBe(button("Remove Share note"));
    // Nothing left to land on: New link.
    press(button("Remove Share note"), 0);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(document.activeElement).toBe(button("New link"));
  });

  it("keeps a focused toast open and reserves its height while it shows", () => {
    vi.useFakeTimers();
    mount();
    press(button("Remove Open project"), 0);
    expect(document.documentElement.style.getPropertyValue("--as-toast-space")).toMatch(/px$/);
    act(() => { vi.advanceTimersByTime(7000); });
    expect($(".as-toast")).not.toBeNull();
    act(() => { button("New link").focus(); });
    act(() => { vi.advanceTimersByTime(6000); });
    expect($(".as-toast")).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--as-toast-space")).toBe("");
  });

  it("tells an empty registry from a search with no match", () => {
    window.localStorage.setItem(STORAGE_KEY, "[]");
    mount();
    expect($(".as-empty")?.textContent).toContain("No links yet");
    // From the Done list the examples (Active and Draft) would stay hidden: Restore switches to All links.
    press(button("Done"));
    press(button("Restore examples"));
    expect(rows()).toHaveLength(SEED.length);
    type(host.querySelector('input[type="search"]') as HTMLInputElement, "zzz");
    expect($(".as-empty")?.textContent).toContain("Nothing matches");
    press(button("Clear search"));
    expect(rows()).toHaveLength(2);
  });
});
