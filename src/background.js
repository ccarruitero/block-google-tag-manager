'use strict';

var badge = {
  cache: {},
  update: (tabId) => chrome.browserAction.setBadgeText({
    tabId,
    text: (badge.cache[tabId] || '') + ''
  }),
  icon: (enabled) => chrome.browserAction.setIcon({
    path: {
      '49': 'data/icons' + (enabled ? '' : '/disabled') + '/icon.png'
    }
  })
};
chrome.tabs.onRemoved.addListener(tabId => delete badge.cache[tabId]);

var block = {
  blacklist: {},
  installed: false,
  listen: (d) => {
    if (block.blacklist[d.tabId]) {
      //console.error('skipped');
      return;
    }
    badge.cache[d.tabId] = (badge.cache[d.tabId] || 0) + 1;
    badge.update(d.tabId);

    return {cancel: true};
  },
  properties: {
    urls: [
      '*://*.googletagmanager.com/*'
    ],
    types: [
      'sub_frame',
      'script',
      'xmlhttprequest'
    ]
  },
  options: ['blocking'],
  install: () => {
    if (block.installed === false) {
      //console.error('installing block');
      block.installed = true;
      chrome.webRequest.onBeforeRequest.addListener(
        block.listen,
        block.properties,
        block.options
      );
    }
  },
  remove: () => {
    if (block.installed) {
      //console.error('removing block');
      block.installed = false;
      chrome.webRequest.onBeforeRequest.removeListener(block.listen);
    }
  }
};

var update = {
  installed: false,
  listen: (d) => {
    if (badge.cache[d.tabId]) {
      badge.cache[d.tabId] = 0;
    }
    if (
      d.url.startsWith('http://www.google.com') ||
      d.url.startsWith('https://www.google.com')
    ) {
      block.blacklist[d.tabId] = true;
    }
  },
  properties: {
    urls: ['<all_urls>'],
    types: [
      'main_frame'
    ]
  },
  options: [],
  install: () => {
    if (update.installed === false) {
      //console.error('installing update');
      update.installed = true;
      chrome.webRequest.onBeforeRequest.addListener(
        update.listen,
        update.properties,
        update.options
      );
    }
  },
  remove: () => {
    if (update.installed) {
      //console.error('removing update');
      update.installed = false;
      chrome.webRequest.onBeforeRequest.removeListener(update.listen);
    }
  }
};

chrome.storage.local.get({
  enabled: true
}, (prefs) => {
  if (prefs.enabled) {
    update.install();
    block.install();
  }
  else {
    badge.icon(false);
  }
});
chrome.storage.onChanged.addListener(prefs => {
  if (prefs.enabled) {
    update[prefs.enabled.newValue ? 'install' : 'remove']();
    block[prefs.enabled.newValue ? 'install' : 'remove']();
  }
  badge.icon(prefs.enabled.newValue);
});

chrome.browserAction.onClicked.addListener(() => {
  chrome.storage.local.get({
    enabled: true
  }, (prefs) => {
    prefs.enabled = !prefs.enabled;
    chrome.storage.local.set(prefs);
  });
});
