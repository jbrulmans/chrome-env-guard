/* Draws the environment marker on the page: a frame, a corner pill, an
   optional top bar, plus a tab title prefix and a recoloured favicon. */
(function () {
  'use strict';

  var HOST_ID = '__env_guard_host__';
  var state = {
    config: null,
    rule: null,
    url: location.href,
    snoozed: false,
    appliedPrefix: '',
    titleObserver: null,
    faviconObserver: null,
    ownFavicon: null
  };

  var INTENSITY = {
    subtle: { border: 0, bar: false, pill: true },
    normal: { border: 5, bar: false, pill: true },
    loud: { border: 8, bar: true, pill: true }
  };

  function ready(fn) {
    if (document.documentElement) return fn();
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  function removeUi() {
    var host = document.getElementById(HOST_ID);
    if (host) host.remove();
  }

  function render() {
    removeUi();
    if (!state.rule || state.snoozed) return;

    var rule = state.rule;
    var g = state.config.global;
    var look = INTENSITY[rule.intensity] || INTENSITY.normal;
    var fg = self.EnvGuard.textColorFor(rule.color);

    var host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
    var shadow = host.attachShadow({ mode: 'open' });

    var corner = g.pillCorner || 'top-right';
    var vertical = corner.indexOf('bottom') === 0 ? 'bottom' : 'top';
    var horizontal = corner.indexOf('left') > -1 ? 'left' : 'right';
    var pillOffset = (look.bar && vertical === 'top') ? '34px' : '10px';

    var style = document.createElement('style');
    style.textContent = [
      ':host{contain:layout style;}',
      '.frame{position:fixed;inset:0;box-sizing:border-box;pointer-events:none;',
      'border:' + look.border + 'px solid ' + rule.color + ';}',
      '.bar{position:fixed;top:0;left:0;right:0;height:26px;display:flex;align-items:center;',
      'justify-content:center;gap:12px;background:' + rule.color + ';color:' + fg + ';',
      'font:600 12px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;',
      'letter-spacing:.14em;text-transform:uppercase;pointer-events:none;}',
      '.pill{position:fixed;' + vertical + ':' + pillOffset + ';' + horizontal + ':10px;',
      'background:' + rule.color + ';color:' + fg + ';border-radius:999px;padding:6px 12px;',
      'font:700 11px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;',
      'letter-spacing:.12em;text-transform:uppercase;pointer-events:none;',
      'box-shadow:0 2px 10px rgba(0,0,0,.28);white-space:nowrap;}'
    ].join('');
    shadow.appendChild(style);

    if (look.border > 0) {
      var frame = document.createElement('div');
      frame.className = 'frame';
      shadow.appendChild(frame);
    }
    if (look.bar) {
      var bar = document.createElement('div');
      bar.className = 'bar';
      bar.textContent = rule.label + ' • ' + location.hostname + ' • ' + rule.label;
      shadow.appendChild(bar);
    }
    if (look.pill && g.showPill !== false) {
      var pill = document.createElement('div');
      pill.className = 'pill';
      pill.textContent = rule.label;
      shadow.appendChild(pill);
    }

    (document.body || document.documentElement).appendChild(host);
  }

  function titlePrefix() {
    var tpl = state.config.global.titleTemplate;
    if (tpl === undefined || tpl === null) tpl = '[{label}] ';
    return String(tpl).replace(/\{label\}/g, state.rule.label);
  }

  function applyTitle() {
    if (state.titleObserver) {
      state.titleObserver.disconnect();
      state.titleObserver = null;
    }
    var wanted = state.rule && !state.snoozed && state.config.global.prefixTitle !== false;
    var prefix = wanted ? titlePrefix() : '';

    /* Strip the prefix we last wrote as well as the one we are about to write,
       so changing the template does not stack prefixes on an open tab. */
    function strip(title) {
      var t = String(title || '');
      [state.appliedPrefix, prefix].forEach(function (p) {
        while (p && t.indexOf(p) === 0) t = t.slice(p.length);
      });
      return t;
    }
    function sync() {
      var next = prefix + strip(document.title);
      if (document.title !== next) document.title = next;
    }
    sync();
    state.appliedPrefix = prefix;
    if (!prefix) return;

    var titleEl = document.querySelector('title');
    if (!titleEl) return;
    state.titleObserver = new MutationObserver(sync);
    state.titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
  }

  /* Sites rewrite their favicon on navigation, so re-apply when <head> changes. */
  function applyFavicon() {
    if (state.faviconObserver) {
      state.faviconObserver.disconnect();
      state.faviconObserver = null;
    }
    var wanted = state.rule && !state.snoozed && state.config.global.replaceFavicon !== false;
    if (!wanted) {
      if (state.ownFavicon && state.ownFavicon.isConnected) state.ownFavicon.remove();
      state.ownFavicon = null;
      document.querySelectorAll('link[data-env-guard-hidden]').forEach(function (link) {
        link.rel = link.getAttribute('data-env-guard-hidden');
        link.removeAttribute('data-env-guard-hidden');
      });
      return;
    }

    var href = drawFavicon(state.rule);
    var head = document.head;
    if (!head || !href) return;

    var write = function () {
      head.querySelectorAll('link[rel~="icon" i]').forEach(function (link) {
        if (link === state.ownFavicon) return;
        link.setAttribute('data-env-guard-hidden', link.rel);
        link.rel = 'env-guard-disabled';
      });
      if (!state.ownFavicon || !state.ownFavicon.isConnected) {
        state.ownFavicon = document.createElement('link');
        state.ownFavicon.rel = 'icon';
        state.ownFavicon.type = 'image/png';
        state.ownFavicon.setAttribute('data-env-guard', '1');
        head.appendChild(state.ownFavicon);
      }
      if (state.ownFavicon.href !== href) state.ownFavicon.href = href;
    };

    write();
    state.faviconObserver = new MutationObserver(function () {
      if (state.rule && !state.snoozed) write();
    });
    state.faviconObserver.observe(head, { childList: true, subtree: true });
  }

  function drawFavicon(rule) {
    try {
      var size = 64;
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = rule.color;
      ctx.beginPath();
      var r = 14;
      ctx.moveTo(r, 0);
      ctx.arcTo(size, 0, size, size, r);
      ctx.arcTo(size, size, 0, size, r);
      ctx.arcTo(0, size, 0, 0, r);
      ctx.arcTo(0, 0, size, 0, r);
      ctx.closePath();
      ctx.fill();

      var initials = String(rule.label || '?').replace(/[^a-z0-9]/gi, '').slice(0, 1).toUpperCase() || '!';
      ctx.fillStyle = self.EnvGuard.textColorFor(rule.color);
      ctx.font = 'bold 44px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, size / 2, size / 2 + 3);
      return canvas.toDataURL('image/png');
    } catch (e) {
      return null;
    }
  }

  function apply() {
    state.rule = self.EnvGuard.findRule(state.config, location.href);
    ready(function () {
      render();
      applyTitle();
      applyFavicon();
    });
  }

  /* SPAs swap routes without a reload; re-evaluate when the URL changes. */
  function watchUrl() {
    setInterval(function () {
      if (location.href === state.url) return;
      state.url = location.href;
      state.snoozed = false;
      apply();
    }, 800);
    window.addEventListener('popstate', function () {
      setTimeout(apply, 0);
    });
  }

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (!msg) return;
    if (msg.type === 'env-guard:snooze') {
      state.snoozed = true;
      render();
      applyTitle();
      applyFavicon();
      sendResponse({ ok: true });
    }
    if (msg.type === 'env-guard:status') {
      sendResponse({ rule: state.rule, snoozed: state.snoozed, url: location.href });
    }
    return true;
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'sync' || !changes.config) return;
    state.config = self.EnvGuard.normalize({ config: changes.config.newValue });
    state.snoozed = false;
    apply();
  });

  self.EnvGuard.load(function (config) {
    state.config = config;
    apply();
    watchUrl();
  });
})();
