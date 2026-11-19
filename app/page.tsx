"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { AppFoot, AppTop, ListButton, Pill, PlusIcon, type Tone } from "@/components/app-shell";
import { EMPTY_DRAFT, SEED, STATUSES, STORAGE_KEY, addRoute as addTo, filterRoutes, parseRoutes, removeRoute, restoreRoute, type Draft, type Route, type Status } from "@/lib/deeplinks";
import { createLocalStore } from "@/lib/local-store";

// Browser-only registry; the server render and first paint use the seed.
const store = createLocalStore(STORAGE_KEY, SEED, parseRoutes);
const TONE: Record<Status, Tone> = { Draft: "amber", Active: "green", Done: "grey" };
type Filter = "All" | Status;
// index / prevId / nextId: where it sat in the stored list when removed (restoreRoute prefers the neighbours).
// nextShown / prevShown: the rows shown around it, for focus.
type RemovedEntry = { route: Route; index: number; prevId?: string; nextId?: string; nextShown?: string; prevShown?: string };
type RemovedBatch = { items: RemovedEntry[]; viaKeyboard: boolean };
const removedLabel = (items: RemovedEntry[]) => (items.length === 1 ? `Removed “${items[0].route.title}”` : `Removed ${items.length} links`);

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function Home() {
  const routes = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [copied, setCopied] = useState("");
  // Every removal still inside the Undo window: one Undo puts them all back where they were.
  const [removed, setRemovedState] = useState<RemovedBatch | null>(null);
  // The latest batch, so two removals before a re-render still both land in it.
  const removedRef = useRef<RemovedBatch | null>(null);
  const setRemoved = (batch: RemovedBatch | null) => { removedRef.current = batch; setRemovedState(batch); };
  const [toastFocused, setToastFocused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const focusRowsNext = useRef<string[] | null>(null);
  const wasComposing = useRef(false);

  const needle = query.trim();
  const inList = filter === "All" ? routes : routes.filter((route) => route.status === filter);
  const visible = filterRoutes(inList, query);
  const countOf = (value: Filter) => (value === "All" ? routes.length : routes.filter((route) => route.status === value).length);
  const title = filter === "All" ? "All links" : filter;
  const ready = Boolean(draft.title.trim() && draft.url.trim());

  useEffect(() => {
    if (composing) titleRef.current?.focus();
    else if (wasComposing.current) newRef.current?.focus();
    wasComposing.current = composing;
  }, [composing]);
  // A removal made from the keyboard moves focus to Undo (the focused Remove button has just gone).
  useEffect(() => { if (removed?.viaKeyboard) undoRef.current?.focus(); }, [removed]);
  // When the toast closes after Undo or Escape, focus goes back near the removed row once the list has re-rendered:
  // the first of these rows still shown, else New link (or the composer's name field when it is open).
  useEffect(() => {
    const ids = focusRowsNext.current;
    if (removed || !ids) return;
    focusRowsNext.current = null;
    const shown = [...document.querySelectorAll<HTMLElement>(".as-row[data-link]")];
    const row = ids.map((id) => shown.find((entry) => entry.dataset.link === id)).find(Boolean);
    (row?.querySelector<HTMLButtonElement>(".as-danger") ?? newRef.current ?? titleRef.current)?.focus();
  }, [removed, routes]);
  // While the toast shows, reserve its height (plus its 24px offset and a gap) at the bottom of the page and in
  // scroll-padding, so the last links and anything focused behind it can scroll clear of it.
  const toastShown = removed !== null;
  useLayoutEffect(() => {
    const toast = toastRef.current;
    if (!toastShown || !toast) return;
    const rootStyle = document.documentElement.style;
    const reserve = () => rootStyle.setProperty("--as-toast-space", `${toast.offsetHeight + 32}px`);
    reserve();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(reserve) : null;
    observer?.observe(toast);
    return () => { observer?.disconnect(); rootStyle.removeProperty("--as-toast-space"); };
  }, [toastShown]);
  // The Undo toast closes 6 s after the latest removal (each removal restarts it), but never while it holds focus.
  useEffect(() => {
    if (!removed || toastFocused) return;
    const timer = window.setTimeout(() => { removedRef.current = null; setRemovedState(null); }, 6000);
    return () => window.clearTimeout(timer);
  }, [removed, toastFocused]);

  function closeComposer() {
    setComposing(false);
    setDraft(EMPTY_DRAFT);
  }

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = addTo(routes, draft, createId(), Date.now());
    if (!next) return;
    store.set(next);
    if (filter !== "All" && filter !== draft.status) setFilter(draft.status);
    setQuery("");
    setAnnouncement(`Added “${draft.title.trim()}”.`);
    closeComposer();
  }

  async function copy(route: Route) {
    try {
      await navigator.clipboard.writeText(route.url);
      setCopied(route.id);
      setAnnouncement(`Copied ${route.url}.`);
      window.setTimeout(() => setCopied((current) => (current === route.id ? "" : current)), 1600);
    } catch {
      setCopied("");
      setAnnouncement("Copy failed: select the URL and copy it by hand.");
    }
  }

  function remove(route: Route, viaKeyboard: boolean) {
    const current = store.getSnapshot();
    const index = current.findIndex((item) => item.id === route.id);
    if (index < 0) return;
    store.set(removeRoute(current, route.id));
    const shownAt = visible.findIndex((item) => item.id === route.id);
    const entry: RemovedEntry = { route: current[index], index, prevId: current[index - 1]?.id, nextId: current[index + 1]?.id, nextShown: visible[shownAt + 1]?.id, prevShown: shownAt > 0 ? visible[shownAt - 1].id : undefined };
    const items = [...(removedRef.current?.items ?? []), entry];
    setRemoved({ items, viaKeyboard });
    setAnnouncement(`${removedLabel(items)}. Undo is available for a few seconds.`);
  }

  function closeToast(focusIds?: string[]) {
    const last = removedRef.current?.items.at(-1);
    // Dismissed: the row after the removed one, else the one before it.
    focusRowsNext.current = focusIds ?? [last?.nextShown, last?.prevShown].filter((id): id is string => Boolean(id));
    setRemoved(null);
    setToastFocused(false);
  }

  function undo() {
    const items = removedRef.current?.items;
    if (!items?.length) return;
    // Latest removal first, so each index refers to the list as it was just before that removal.
    store.update((current) => items.reduceRight((list, { route, index, prevId, nextId }) => restoreRoute(list, route, index, { prevId, nextId }), current));
    setAnnouncement(items.length === 1 ? `Restored “${items[0].route.title}”.` : `Restored ${items.length} links.`);
    // Undone: back to the restored row (the latest one, where the user was last).
    closeToast([items[items.length - 1].route.id]);
  }

  function clearSearch() {
    setQuery("");
    searchRef.current?.focus();
  }

  const lists: { value: Filter; tone?: Tone }[] = [{ value: "All" }, ...STATUSES.map((status) => ({ value: status, tone: TONE[status] }))];

  return (
    <div className="as">
      <a className="as-skip" href="#main">Skip to content</a>
      <AppTop name="Deep Links" tagline="Name an app route, copy its link" />

      <div className="as-body">
        <aside className="as-side" aria-label="Lists">
          <h2>Lists</h2>
          <ul className="as-lists">
            {lists.map(({ value, tone }) => (
              <ListButton key={value} label={value === "All" ? "All links" : value} count={countOf(value)} tone={tone} current={filter === value} onSelect={() => setFilter(value)} />
            ))}
          </ul>
        </aside>

        <main id="main" className="as-main">
          <div className="as-head">
            <div>
              <h1>{title}</h1>
              <p aria-live="polite">{visible.length} {visible.length === 1 ? "link" : "links"}{needle ? ` matching “${needle}”` : ""}</p>
            </div>
            <div className="as-tools">
              <label className="as-search">
                <span className="as-sr">Search links</span>
                <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or URL" />
              </label>
              {composing ? null : <button ref={newRef} type="button" className="as-button" onClick={() => setComposing(true)}><PlusIcon />New link</button>}
            </div>
          </div>

          {composing ? (
            <form className="as-composer" onSubmit={add} aria-label="New link">
              <label className="as-field">Name
                <input ref={titleRef} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Project detail" autoComplete="off" />
              </label>
              <label className="as-field">Deep link URL
                <input className="dl-url" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="app://projects/{id}" spellCheck={false} autoComplete="off" />
              </label>
              {ready ? null : <p className="dl-hint" id="add-hint">Add needs a name and a URL.</p>}
              <div className="as-composer-foot">
                <div className="as-segmented-wrap">
                  <span id="state-label">State</span>
                  <div className="as-segmented" role="group" aria-labelledby="state-label">
                    {STATUSES.map((status) => (
                      <button key={status} type="button" aria-pressed={draft.status === status} onClick={() => setDraft({ ...draft, status })}>{status}</button>
                    ))}
                  </div>
                </div>
                <div className="as-composer-actions">
                  <button type="button" className="as-plain" onClick={closeComposer}>Cancel</button>
                  <button type="submit" className="as-button" disabled={!ready} aria-describedby={ready ? undefined : "add-hint"}>Add</button>
                </div>
              </div>
            </form>
          ) : null}

          {visible.length ? (
            <ul className="as-list" aria-label={title}>
              {visible.map((route) => (
                <li className="as-row dl-row" key={route.id} data-link={route.id}>
                  <div>
                    <h3>{route.title}</h3>
                    <p className="dl-url">{route.url}</p>
                  </div>
                  <Pill tone={TONE[route.status]}>{route.status}</Pill>
                  <div className="dl-actions">
                    <button type="button" className="as-plain" aria-label={copied === route.id ? `Copied ${route.title}` : `Copy URL of ${route.title}`} onClick={() => copy(route)}>{copied === route.id ? "Copied" : "Copy URL"}</button>
                    <button type="button" className="as-plain as-danger" aria-label={`Remove ${route.title}`} onClick={(event) => remove(route, event.detail === 0)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="as-list as-empty">
              {needle ? (
                <>
                  <strong>Nothing matches</strong>
                  No link in {filter === "All" ? "your lists" : title} mentions “{needle}”.
                  <div className="dl-empty-actions"><button type="button" className="as-plain" onClick={clearSearch}>Clear search</button></div>
                </>
              ) : routes.length === 0 ? (
                <>
                  <strong>No links yet</strong>
                  Press New link to add the first one, or bring back the two examples.
                  <div className="dl-empty-actions"><button type="button" className="as-plain" onClick={() => store.set(SEED)}>Restore examples</button></div>
                </>
              ) : (
                <><strong>This list is empty</strong>No link is {title} yet. Press New link and pick {title} as the state to add one.</>
              )}
            </div>
          )}

          <p className="as-note">Saved in this browser only. A list of links to hand off, not a live app router: nothing opens or checks these URLs.</p>
        </main>
      </div>

      <p className="as-sr" role="status" aria-live="polite">{announcement}</p>
      {removed ? (
        <div
          ref={toastRef}
          className="as-toast"
          role="group"
          aria-label="Undo remove"
          onFocus={() => setToastFocused(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setToastFocused(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") closeToast(); }}
        >
          <span>{removedLabel(removed.items)}</span>
          <button ref={undoRef} type="button" className="as-plain" onClick={undo} aria-label={removed.items.length === 1 ? "Undo remove" : `Undo remove of ${removed.items.length} links`}>Undo</button>
        </div>
      ) : null}

      <AppFoot source="https://github.com/bookchaowalit-website/marketing-deeplinks-web" />
    </div>
  );
}
