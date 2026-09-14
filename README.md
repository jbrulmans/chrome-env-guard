# Environment Guard

A Chrome extension that makes it obvious when a tab is pointed at **production**.

Chrome has no API for swapping the browser theme at runtime (`browser.theme` is Firefox-only,
and a Chrome theme extension cannot contain any logic). So instead of recolouring the browser
chrome, Env Guard recolours the thing you are actually looking at:

- a coloured **frame** down the sides and across the bottom
- a **bar** along the bottom of the page (loud rules only)
- a **corner pill** with the environment name (rules without a bar)
- a **tab title prefix**, e.g. `[PRODUCTION] Dashboard`
- a **recoloured favicon**, so production stands out in a row of pinned tabs
- a **toolbar badge** showing the matched environment

Everything — URLs, labels, colours, how loud each environment is — is configurable on the
options page. Nothing is hard-coded in the content script.

## Install

1. `git clone` this repo.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick this folder.

The options page opens on first install.

## Configure

Open the options page (toolbar icon → *Settings*, or `chrome://extensions` → *Details* →
*Extension options*).

Each environment rule has:

| Field | Meaning |
| --- | --- |
| enabled | Turn a rule off without deleting it |
| colour | Used for the frame, bar, pill, favicon and toolbar badge |
| label | Shown in the pill, the bar and the tab title |
| intensity | `subtle` = pill only · `normal` = pill + frame · `loud` = pill + thick frame + top bar |
| patterns | One URL pattern per line |

**Rules are evaluated top to bottom and the first match wins**, so keep the most specific rule
highest. Use the arrows to reorder.

### Pattern syntax

| Pattern | Matches |
| --- | --- |
| `https://app.example.com/*` | glob — `*` matches any run of characters, anchored at both ends |
| `localhost` | no `*` present → plain substring match anywhere in the URL |
| `re:^https://[a-z]+\.example\.com/` | regular expression (case-insensitive) |

Patterns are matched against the full URL, so you can scope a rule to a path
(`https://app.example.com/admin/*`) as easily as to a host.

Use **Test a URL** at the bottom of the options page to check which rule a URL hits before
you save.

### Display options

These apply to every rule:

| Option | Effect |
| --- | --- |
| Frame | `all edges`, `sides and bottom` (leaves the top completely clear), or `corners only` |
| Thickness | Frame width in pixels (default 4). `loud` rules draw it 1.5x thicker |
| Bar | Which edge the `loud` bar sits on, top or bottom |
| Reserve space for the frame | Pad the page so the frame sits beside your content instead of over it |
| Corner pill | Show the environment name in a corner of the page |
| Pill corner | Which corner it sits in |
| Prefix the tab title | Turn the title prefix on or off |
| Tab title prefix | The prefix itself — see below |
| Recolour the favicon | Replace the site's favicon with the rule colour |

The frame is a `position: fixed` overlay, so on its own it would cover a few pixels along each
edge of the page. **Reserve space for the frame** is on by default: it pads `<html>` by exactly
the width of the frame, so the marker sits beside your content rather than over it.

### The top edge

One case padding cannot solve: a site's own **fixed menu bar** is laid out against the viewport,
not against `<html>`, so no amount of padding moves it down &mdash; it slides underneath anything
drawn at the top of the screen. Nothing a content script can do changes that.

So the defaults simply stay out of the top: the frame is `sides and bottom`, and the `loud` bar
sits at the **bottom**. Your app's navigation is never covered. Switch either back if the page
you care about has no fixed header.

Two remaining caveats for reserve mode: pages sized with `100vh` may gain a small scrollbar, and
a site's fixed elements on the other edges can still overlap the frame there.

The corner pill is only drawn for rules **without** a bar &mdash; on a `loud` rule the bar already
names the environment, so a pill would be a second copy sitting on your page for no reason.

The **tab title prefix** is a template. `{label}` is replaced with the environment name, and
a trailing space is kept as typed, so the default `[{label}] ` renders as `[PRODUCTION] Dashboard`.
Other things that work:

| Template | Tab title becomes |
| --- | --- |
| `[{label}] ` | `[PRODUCTION] Dashboard` |
| `🔴 ` | `🔴 Dashboard` |
| `{label} — ` | `PRODUCTION — Dashboard` |
| *(empty)* | `Dashboard` — no prefix |

Changing the template rewrites the prefix on open tabs rather than stacking a second one.

### Sharing config across a team

**Export JSON** writes the whole config to a file; **Import JSON** loads one back. Commit the
file to a repo and everyone gets the same environment colours. `example-config.json` in this
repo is the shipped default.

Settings live in `chrome.storage.sync`, so they follow your Chrome profile across machines.

## Defaults

The shipped rules are placeholders — **edit the production one to your own URL first**,
that is the rule that actually matters.

| Environment | Pattern | Colour | Intensity |
| --- | --- | --- | --- |
| LOCAL | `localhost`, `127.0.0.1`, `0.0.0.0`, `*.local/*`, `*.test/*` | green | subtle |
| STAGING | `staging`, `sandbox` (substring match anywhere in the URL) | amber | normal |
| PRODUCTION | `https://app.example.com/*` — **replace this** | red | loud |

**Restore defaults** on the options page brings these back.

## Notes

- The overlay is `pointer-events: none` and lives in a shadow root, so it never intercepts
  clicks or leaks styles into the page.
- If a marker ever covers something you need, the popup has **Hide marker on this tab** —
  it lasts until you reload or navigate.
- Chrome does not inject content scripts into `chrome://` pages or the Web Store, so no marker
  appears there. The toolbar badge still works everywhere.
- Single-page apps are handled: the URL is re-checked on route changes.

## Files

| File | Role |
| --- | --- |
| `manifest.json` | MV3 manifest |
| `match.js` | Pattern matching, defaults, config loading (shared by all contexts) |
| `content.js` | Draws the frame, bar, pill, title prefix and favicon |
| `background.js` | Service worker; keeps the toolbar badge in sync |
| `options.html` / `options.js` | Rule editor, import/export, URL tester |
| `popup.html` / `popup.js` | Current-tab status, snooze, link to settings |
| `icons/` | Toolbar and store icons (16/32/48/128) |

## Licence

MIT
