---
name: Deep Links Route Registry
description: A local route switchboard for addressable app destinations.
colors:
  void: "#101817"
  panel: "#16221f"
  ink: "#eef0d8"
  muted: "#94a096"
  line: "#33443d"
  lime: "#d4ef64"
  amber: "#f4b75b"
  red: "#ef7765"
typography:
  display:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "clamp(62px, 10vw, 140px)"
    fontWeight: 400
    lineHeight: 0.79
  body:
    fontFamily: "Georgia, serif"
    fontSize: "16px"
    lineHeight: 1.55
  label:
    fontFamily: "ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: "0.17em"
rounded:
  none: "0"
spacing:
  section: "36px 0"
  row: "20px 0"
components:
  button-primary:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.void}"
    rounded: "{rounded.none}"
    padding: "12px 14px"
  route-chip:
    backgroundColor: "transparent"
    textColor: "{colors.lime}"
    rounded: "{rounded.none}"
    padding: "5px 7px"
---

# Design System: Deep Links Route Registry

## Overview

**Creative North Star: "A switchboard route registry."**

The page makes a local route list feel like a network: a console number, grid-map traces, node states, and monospace URLs. It explains the boundary honestly—the map is a preview and not a live router—while keeping add/search/copy/delete immediate.

**Key Characteristics:**
- Void green-black ground with acid-lime action.
- Grid paper and sparse node traces.
- Route rows behave like registry records, not marketing cards.

## Colors

The void and ink carry most of the surface. Lime is the active signal, amber is an alternate trace, and red is reserved for destructive removal.

### Primary
- **Signal lime** (#d4ef64): primary action, active state, and network nodes.

### Secondary
- **Trace amber** (#f4b75b): secondary path and route index.
- **Fault red** (#ef7765): remove affordance.

### Neutral
- **Void** (#101817): page background.
- **Route ink** (#eef0d8): primary text.
- **Quiet text** (#94a096): secondary copy.
- **Grid line** (#33443d): map and row rules.

## Typography

**Display Font:** Arial, Helvetica, sans-serif
**Body Font:** Georgia, serif
**Label/Mono Font:** ui-monospace, monospace

**Character:** Large compressed-looking sans headlines are grounded by route strings and tiny terminal labels.

### Hierarchy
- **Display** (400, clamp 62–140px, .79): path thesis.
- **Headline** (400, clamp 34–65px, .9): map and registry anchors.
- **Body** (400, 14–16px, 1.5): boundary and handoff context.
- **Label** (700, 10px, .17em, uppercase): node metadata and state.

## Layout

The 1260px shell starts with a three-column console header. The active network has a full-width grid field with a right-side trace motif. The builder uses a labeled left rail; rows use a five-column desktop registry and collapse to a stacked node record below 760px.

## Elevation & Depth

Flat by default. Grid lines, tonal panel separation, and glowing-looking node color supply depth; no shadow is used.

## Shapes

Square controls and chips. Circles are reserved for signal nodes and the console’s status dots. Lines are 1px and visible enough to orient the map.

## Components

### Buttons
- **Shape:** square (`0` radius).
- **Primary:** lime background with void text.
- **Hover / Focus:** brighter lime on hover; lime focus outline.

### Inputs / Fields
- **Style:** transparent void fields with a green-gray bottom rule.
- **Focus:** rule shifts to lime.

### Signature Component
- **Network field:** CSS grid, nodes, and sparse traces make the route count visible without pretending to be a live graph.

## Do's and Don'ts

### Do:
- **Do** keep route URLs legible as the primary content.
- **Do** use lime sparingly as a signal, not as a fill for every surface.
- **Do** state that local storage is the only persistence boundary.

### Don't:
- **Don't** turn the route registry into a generic white CRUD table.
- **Don't** imply that adding a record changes a production app router.
- **Don't** use red for ordinary status; reserve it for removal or faults.
