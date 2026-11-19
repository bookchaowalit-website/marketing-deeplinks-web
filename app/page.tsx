"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { AppFoot, AppTop, ListButton, Pill, PlusIcon, type Tone } from "@/components/app-shell";
import { EMPTY_DRAFT, SEED, STATUSES, STORAGE_KEY, addRoute as addTo, filterRoutes, parseRoutes, removeRoute, restoreRoute, type Draft, type Route, type Status } from "@/lib/deeplinks";
import { createLocalStore } from "@/lib/local-store";

// Browser-only registry; the server render and first paint use the seed.
const store = createLocalStore(STORAGE_KEY, SEED, parseRoutes);
const TONE: Record<Status, Tone> = { Draft: "amber", Active: "green", Done: "grey" };
type Filter = "All" | Status;

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
  const [removed, setRemoved] = useState<{ route: Route; index: number } | null>(null);
  const [toastFocused, setToastFocused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
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
  // The Undo toast closes 6 s after the latest removal, but never while it holds focus.
  useEffect(() => {
    if (!removed || toastFocused) return;
    const timer = window.setTimeout(() => setRemoved(null), 6000);
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

  function remove(route: Route) {
    const index = routes.findIndex((item) => item.id === route.id);
    store.update((current) => removeRoute(current, route.id));
    setRemoved({ route, index });
    setAnnouncement(`Removed “${route.title}”. Undo is available for a few seconds.`);
  }

  function undo() {
    if (!removed) return;
    store.update((current) => restoreRoute(current, removed.route, removed.index));
    setAnnouncement(`Restored “${removed.route.title}”.`);
    setRemoved(null);
    setToastFocused(false);
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
                <li className="as-row dl-row" key={route.id}>
                  <div>
                    <h3>{route.title}</h3>
                    <p className="dl-url">{route.url}</p>
                  </div>
                  <Pill tone={TONE[route.status]}>{route.status}</Pill>
                  <div className="dl-actions">
                    <button type="button" className="as-plain" aria-label={copied === route.id ? `Copied ${route.title}` : `Copy URL of ${route.title}`} onClick={() => copy(route)}>{copied === route.id ? "Copied" : "Copy URL"}</button>
                    <button type="button" className="as-plain as-danger" aria-label={`Remove ${route.title}`} onClick={() => remove(route)}>Remove</button>
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
          className="as-toast"
          role="group"
          aria-label="Undo remove"
          onFocus={() => setToastFocused(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setToastFocused(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") { setRemoved(null); setToastFocused(false); } }}
        >
          <span>Removed “{removed.route.title}”</span>
          <button type="button" className="as-plain" onClick={undo} aria-label="Undo remove">Undo</button>
        </div>
      ) : null}

      <AppFoot source="https://github.com/bookchaowalit-website/marketing-deeplinks-web" />
    </div>
  );
}
