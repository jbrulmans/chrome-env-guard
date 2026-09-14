/* Shared matching + defaults. Classic script: used by the content script,
   the service worker (importScripts) and the options/popup pages. */
(function (root) {
  'use strict';

  var DEFAULT_CONFIG = {
    version: 1,
    global: {
      showPill: true,
      pillCorner: 'top-right',
      prefixTitle: true,
      replaceFavicon: true
    },
    rules: [
      {
        id: 'local',
        label: 'LOCAL',
        color: '#16a34a',
        intensity: 'subtle',
        enabled: true,
        patterns: [
          'localhost',
          '127.0.0.1',
          '0.0.0.0',
          '*.local/*',
          '*.test/*'
        ]
      },
      {
        id: 'staging',
        label: 'STAGING',
        color: '#f59e0b',
        intensity: 'normal',
        enabled: true,
        patterns: [
          'staging',
          'sandbox'
        ]
      },
      {
        id: 'production',
        label: 'PRODUCTION',
        color: '#dc2626',
        intensity: 'loud',
        enabled: true,
        patterns: [
          'https://app.example.com/*'
        ]
      }
    ]
  };

  /* Pattern syntax:
       re:<regex>   -> case-insensitive regular expression against the full URL
       foo*bar      -> glob, * matches any run of characters
       plain text   -> substring match
  */
  function compile(pattern) {
    var p = String(pattern || '').trim();
    if (!p) return null;
    if (p.toLowerCase().indexOf('re:') === 0) {
      try {
        return new RegExp(p.slice(3), 'i');
      } catch (e) {
        return null;
      }
    }
    var escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (p.indexOf('*') === -1) {
      return new RegExp(escaped, 'i');
    }
    return new RegExp('^' + escaped.replace(/\\\*/g, '.*') + '$', 'i');
  }

  function ruleMatches(rule, url) {
    if (!rule || rule.enabled === false) return false;
    var patterns = rule.patterns || [];
    for (var i = 0; i < patterns.length; i++) {
      var re = compile(patterns[i]);
      if (re && re.test(url)) return true;
    }
    return false;
  }

  /* First enabled rule wins, so order the list most-specific first. */
  function findRule(config, url) {
    if (!url) return null;
    var rules = (config && config.rules) || [];
    for (var i = 0; i < rules.length; i++) {
      if (ruleMatches(rules[i], url)) return rules[i];
    }
    return null;
  }

  function normalize(stored) {
    var cfg = stored && stored.config;
    if (!cfg || !Array.isArray(cfg.rules)) return clone(DEFAULT_CONFIG);
    return {
      version: cfg.version || 1,
      global: Object.assign({}, DEFAULT_CONFIG.global, cfg.global || {}),
      rules: cfg.rules
    };
  }

  function load(cb) {
    chrome.storage.sync.get({ config: null }, function (stored) {
      cb(normalize(stored));
    });
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /* Prefer white pill text, but fall back to near-black when white would drop
     below a 3:1 contrast ratio (amber and other light rule colours). */
  function textColorFor(hex) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return '#ffffff';
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var parts = [0, 2, 4].map(function (i) {
      var c = parseInt(h.substr(i, 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    var lum = 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
    var whiteContrast = 1.05 / (lum + 0.05);
    return whiteContrast >= 3 ? '#ffffff' : '#111111';
  }

  root.EnvGuard = {
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    compile: compile,
    ruleMatches: ruleMatches,
    findRule: findRule,
    normalize: normalize,
    load: load,
    clone: clone,
    textColorFor: textColorFor
  };
})(typeof self !== 'undefined' ? self : this);
