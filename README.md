# Env Guard

A Chrome extension that makes it obvious when a tab is pointed at **production**.

Chrome has no API for swapping the browser theme at runtime (`browser.theme` is Firefox-only,
and a Chrome theme extension cannot contain any logic). So instead of recolouring the browser
chrome, Env Guard recolours the thing you are actually looking at:

- a coloured **frame** around the viewport
- a **top bar** across the page (loud rules only)
- a **corner pill** with the environment name
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

## Icon

The icon is a thick coloured frame around a dark interior — the same shape the extension
draws on a production page. To recolour it:

```sh
python3 tools/make-icons.py --frame '#7c3aed' --fill '#17181d'
```

That rewrites `icons/icon{16,32,48,128}.png` in place. Pure standard library, so there is
nothing to install.

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
| `tools/make-icons.py` | Regenerates those icons — no dependencies |

## Licence

MIT
