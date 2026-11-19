# Design

Since 2026-11-19 this app uses the shared **App shell**: rules, pieces and the move recipe are in
[`APP-SHELL.md`](APP-SHELL.md). The earlier one-off look (green-black "switchboard" with a decorative node map) was
retired so every list app on `*.bookchaowalit.com` reads the same way; see git history for its old design notes.

Layout: the sidebar lists links by state (All, Draft, Active, Done) with counts; the head has search and the one filled
"New link" button; the composer opens in place (name, URL, state as a segmented control) and says why Add is disabled
while a field is empty; rows show the name, the URL in mono, a state pill (amber Draft, green Active, grey Done) and two
plain actions, Copy URL and Remove (undoable). The empty state differs for an empty registry (with "Restore examples")
and a search with no match. App-specific CSS uses the `dl-` prefix.
