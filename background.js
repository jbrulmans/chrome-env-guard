/* Keeps the toolbar badge in sync with the matched rule for each tab. */
importScripts('match.js');

var cachedConfig = null;

function withConfig(cb) {
  if (cachedConfig) return cb(cachedConfig);
  self.EnvGuard.load(function (config) {
    cachedConfig = config;
    cb(config);
  });
}

function badgeFor(tabId, url) {
  withConfig(function (config) {
    var rule = self.EnvGuard.findRule(config, url || '');
    if (!rule) {
      chrome.action.setBadgeText({ tabId: tabId, text: '' });
      chrome.action.setTitle({ tabId: tabId, title: 'Env Guard – no rule matches this page' });
      return;
    }
    var short = String(rule.label || '').replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase();
    chrome.action.setBadgeText({ tabId: tabId, text: short });
    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: rule.color });
    chrome.action.setTitle({ tabId: tabId, title: 'Env Guard – ' + rule.label });
  });
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'loading' || changeInfo.url) badgeFor(tabId, changeInfo.url || tab.url);
});

chrome.tabs.onActivated.addListener(function (info) {
  chrome.tabs.get(info.tabId, function (tab) {
    if (chrome.runtime.lastError || !tab) return;
    badgeFor(tab.id, tab.url);
  });
});

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area !== 'sync' || !changes.config) return;
  cachedConfig = self.EnvGuard.normalize({ config: changes.config.newValue });
  chrome.tabs.query({}, function (tabs) {
    tabs.forEach(function (tab) { badgeFor(tab.id, tab.url); });
  });
});

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install') chrome.runtime.openOptionsPage();
});
