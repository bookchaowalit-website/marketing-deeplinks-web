"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { EMPTY_DRAFT, SEED, STATUSES, STORAGE_KEY, addRoute as addTo, filterRoutes, isStatus, parseRoutes, removeRoute, type Draft, type Route } from "@/lib/deeplinks";
import { createLocalStore } from "@/lib/local-store";

// Browser-only registry; the server render and first paint use the seed.
const store = createLocalStore(STORAGE_KEY, SEED, parseRoutes);

export default function Home() {
  const routes = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [copied, setCopied] = useState("");
  const filtered = useMemo(() => filterRoutes(routes, query), [routes, query]);
  const addRoute = () => {
    const next = addTo(routes, draft, crypto.randomUUID(), Date.now());
    if (!next) return;
    store.set(next);
    setDraft(EMPTY_DRAFT);
  };
  const copyRoute = async (route: Route) => { try { await navigator.clipboard.writeText(route.url); setCopied(route.id); window.setTimeout(() => setCopied(""), 1400); } catch { setCopied(""); } };

  return (
    <main className="route-shell">
      <header className="route-header"><div className="route-console"><span>LINK MAP</span><strong>07</strong><i /><i /><i /></div><div><p className="route-kicker">DEEP LINKS / ROUTE REGISTRY</p><h1>Give every<br /><em>path a pulse.</em></h1><p className="route-deck">A local map for app routes that should be addressable. Search the registry, add a destination, and copy the URL you want to hand off.</p></div><div className="route-status"><span>NODE STATUS</span><b>LOCAL</b><small>{routes.length} routes</small></div></header>

      <section className="route-map" aria-labelledby="map-title"><div className="map-grid" aria-hidden="true"><i /><i /><i /><i /><i /></div><div className="map-heading"><p className="route-kicker">ACTIVE NETWORK</p><h2 id="map-title">{filtered.length} mapped {filtered.length === 1 ? "route" : "routes"}</h2><p>Every record stays in this browser. The linework is a preview, not a live app router.</p></div><div className="map-nodes" aria-hidden="true"><span className="node node-a" /><span className="node node-b" /><span className="node node-c" /><span className="trace trace-a" /><span className="trace trace-b" /></div></section>

      <section className="route-builder" aria-labelledby="builder-title"><div className="builder-label"><span className="signal-dot" /><p className="route-kicker">PATCH THE MAP</p><h2 id="builder-title">Add a destination</h2><p>Use a scheme or path that makes the handoff clear.</p></div><div className="builder-form"><label><span>Route name</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Project detail" /></label><label className="url-input"><span>Deep link URL</span><input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="app://projects/{id}" spellCheck={false} /></label><label><span>State</span><select value={draft.status} onChange={(event) => isStatus(event.target.value) && setDraft({ ...draft, status: event.target.value })}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label><button type="button" onClick={addRoute}>Add node <b>+</b></button></div></section>

      <section className="registry" aria-labelledby="registry-title"><div className="registry-top"><div><p className="route-kicker">THE REGISTRY</p><h2 id="registry-title">Known destinations</h2></div><label className="route-search"><span>Filter nodes</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="search name or URL" /></label></div>{filtered.length === 0 ? <p className="route-empty">No node matches that signal. Clear the filter or add a destination above.</p> : <div className="route-list">{filtered.map((route, index) => <article key={route.id} className="route-row"><span className="route-index">N{String(index + 1).padStart(2, "0")}</span><div className="route-name"><h3>{route.title}</h3><code>{route.url}</code></div><span className={`route-chip chip-${route.status.toLowerCase()}`}>{route.status}</span><button type="button" className="copy-route" onClick={() => copyRoute(route)}>{copied === route.id ? "Copied" : "Copy URL"}</button><button type="button" className="delete-route" onClick={() => store.update((current) => removeRoute(current, route.id))} aria-label={`Remove ${route.title}`}>×</button></article>)}</div>}</section>
      <footer className="route-footer"><span>DEEPLINKS / 2026</span><span>Local-only route registry · no production router implied</span></footer>
    </main>
  );
}
