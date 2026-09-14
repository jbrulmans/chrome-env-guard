(function () {
  'use strict';

  var badge = document.getElementById('badge');
  var host = document.getElementById('host');
  var snooze = document.getElementById('snooze');

  document.getElementById('options').addEventListener('click', function () {
    chrome.runtime.openOptionsPage();
  });

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs[0];
    if (!tab) return;
    host.textContent = tab.url || '';

    window.EnvGuard.load(function (config) {
      var rule = window.EnvGuard.findRule(config, tab.url || '');
      if (!rule) {
        badge.textContent = 'no rule matches';
        badge.style.background = 'transparent';
        badge.style.color = 'var(--muted)';
        badge.style.padding = '0';
        snooze.disabled = true;
        return;
      }
      badge.textContent = rule.label;
      badge.style.background = rule.color;
      badge.style.color = window.EnvGuard.textColorFor(rule.color);

      snooze.addEventListener('click', function () {
        chrome.tabs.sendMessage(tab.id, { type: 'env-guard:snooze' }, function () {
          void chrome.runtime.lastError;
          window.close();
        });
      });
    });
  });
})();
