(function () {
  'use strict';

  var EG = window.EnvGuard;
  var config = null;
  var rulesEl = document.getElementById('rules');

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k in node) node[k] = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  function renderRules() {
    rulesEl.textContent = '';
    config.rules.forEach(function (rule, index) {
      rulesEl.appendChild(renderRule(rule, index));
    });
    runTest();
  }

  function renderRule(rule, index) {
    var enabled = el('input', { type: 'checkbox', checked: rule.enabled !== false, title: 'Enabled' });
    enabled.addEventListener('change', function () { rule.enabled = enabled.checked; runTest(); });

    var color = el('input', { type: 'color', value: rule.color || '#dc2626', class: 'swatch', title: 'Colour' });
    color.addEventListener('input', function () { rule.color = color.value; runTest(); });

    var label = el('input', { type: 'text', value: rule.label || '', class: 'label-input', placeholder: 'PRODUCTION' });
    label.addEventListener('input', function () { rule.label = label.value; runTest(); });

    var intensity = el('select', { class: 'intensity' });
    [['subtle', 'subtle'], ['normal', 'normal'], ['loud', 'loud']].forEach(function (opt) {
      intensity.appendChild(el('option', { value: opt[0], text: opt[1], selected: rule.intensity === opt[0] }));
    });
    intensity.value = rule.intensity || 'normal';
    intensity.addEventListener('change', function () { rule.intensity = intensity.value; });

    var up = el('button', { class: 'icon', text: '↑', title: 'Move up' });
    up.addEventListener('click', function () { move(index, -1); });
    var down = el('button', { class: 'icon', text: '↓', title: 'Move down' });
    down.addEventListener('click', function () { move(index, 1); });
    var del = el('button', { class: 'icon danger', text: '✕', title: 'Delete' });
    del.addEventListener('click', function () {
      config.rules.splice(index, 1);
      renderRules();
    });

    var patterns = el('textarea', {
      value: (rule.patterns || []).join('\n'),
      placeholder: 'https://app.example.com/*\n*.staging.example.com/*\nre:^https://\\d+\\.example\\.com'
    });
    patterns.addEventListener('input', function () {
      rule.patterns = patterns.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      runTest();
    });

    return el('div', { class: 'card' }, [
      el('div', { class: 'rule-head' }, [
        enabled, color, label, intensity,
        el('span', { class: 'grow' }), up, down, del
      ]),
      el('p', { class: 'hint', text: 'One URL pattern per line. * is a wildcard; a line without * matches anywhere in the URL; prefix with re: for a regular expression.' }),
      patterns
    ]);
  }

  function move(index, delta) {
    var target = index + delta;
    if (target < 0 || target >= config.rules.length) return;
    var item = config.rules.splice(index, 1)[0];
    config.rules.splice(target, 0, item);
    renderRules();
  }

  function readGlobals() {
    config.global.showPill = document.getElementById('showPill').checked;
    config.global.prefixTitle = document.getElementById('prefixTitle').checked;
    config.global.replaceFavicon = document.getElementById('replaceFavicon').checked;
    config.global.pillCorner = document.getElementById('pillCorner').value;
    config.global.titleTemplate = document.getElementById('titleTemplate').value;
  }

  function writeGlobals() {
    document.getElementById('showPill').checked = config.global.showPill !== false;
    document.getElementById('prefixTitle').checked = config.global.prefixTitle !== false;
    document.getElementById('replaceFavicon').checked = config.global.replaceFavicon !== false;
    document.getElementById('pillCorner').value = config.global.pillCorner || 'top-right';
    var tpl = config.global.titleTemplate;
    document.getElementById('titleTemplate').value = tpl === undefined || tpl === null ? '[{label}] ' : tpl;
  }

  function runTest() {
    var url = document.getElementById('testUrl').value.trim();
    var out = document.getElementById('testResult');
    if (!url) {
      out.textContent = '—';
      out.style.color = '';
      return;
    }
    var rule = EG.findRule(config, url);
    out.textContent = rule ? rule.label : 'no match';
    out.style.color = rule ? rule.color : '';
  }

  function flash(message) {
    var status = document.getElementById('status');
    status.textContent = message;
    setTimeout(function () { status.textContent = ''; }, 2000);
  }

  function save() {
    readGlobals();
    chrome.storage.sync.set({ config: config }, function () {
      flash(chrome.runtime.lastError ? 'Could not save: ' + chrome.runtime.lastError.message : 'Saved');
    });
  }

  document.getElementById('add').addEventListener('click', function () {
    config.rules.push({
      id: 'rule-' + Date.now(),
      label: 'NEW',
      color: '#7c3aed',
      intensity: 'normal',
      enabled: true,
      patterns: []
    });
    renderRules();
  });

  document.getElementById('save').addEventListener('click', save);
  document.getElementById('testUrl').addEventListener('input', runTest);

  document.getElementById('reset').addEventListener('click', function () {
    if (!confirm('Replace all rules with the defaults?')) return;
    config = EG.clone(EG.DEFAULT_CONFIG);
    writeGlobals();
    renderRules();
    save();
  });

  document.getElementById('export').addEventListener('click', function () {
    readGlobals();
    var blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    var a = el('a', { href: URL.createObjectURL(blob), download: 'env-guard-config.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  document.getElementById('import').addEventListener('click', function () {
    document.getElementById('file').click();
  });

  document.getElementById('file').addEventListener('change', function (event) {
    var file = event.target.files[0];
    if (!file) return;
    file.text().then(function (text) {
      var parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.rules)) throw new Error('missing "rules" array');
      config = EG.normalize({ config: parsed });
      writeGlobals();
      renderRules();
      save();
    }).catch(function (err) {
      alert('Could not import that file: ' + err.message);
    });
    event.target.value = '';
  });

  EG.load(function (loaded) {
    config = loaded;
    writeGlobals();
    renderRules();
  });
})();
