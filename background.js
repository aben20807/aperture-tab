// Background Service Worker for Aperture Tab Extension

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Aperture Tab Extension installed');
  
  // Set default settings
  const defaultSettings = {
    autoRefresh: 'manual', // manual, 30min, 1hour, daily
    imageQuality: 'full', // regular, full, raw
    collections: [], // Array of collection IDs
    searchQuery: '', // Search term for images
    showInfo: true, // Show photographer info
    apiKey: '' // Unsplash API key
  };
  
  chrome.storage.local.get('settings', (result) => {
    if (!result.settings) {
      chrome.storage.local.set({ settings: defaultSettings });
    }
  });
});

// Handle auto-refresh based on settings
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoRefresh') {
    // Notify all new tab pages to refresh
    chrome.runtime.sendMessage({ action: 'autoRefresh' }).catch(() => {
      // No tabs listening, that's okay
    });
  }
});

// Set up auto-refresh alarm based on settings
function setupAutoRefresh(interval) {
  chrome.alarms.clear('autoRefresh', () => {
    if (interval === 'manual') return;
    
    let minutes;
    switch (interval) {
      case '30min':
        minutes = 30;
        break;
      case '1hour':
        minutes = 60;
        break;
      case 'daily':
        minutes = 1440; // 24 hours
        break;
      default:
        return;
    }
    
    chrome.alarms.create('autoRefresh', {
      periodInMinutes: minutes
    });
  });
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.settings) {
    const newSettings = changes.settings.newValue;
    if (newSettings && newSettings.autoRefresh) {
      setupAutoRefresh(newSettings.autoRefresh);
    }
  }
});

// Initialize auto-refresh on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get('settings', (result) => {
    if (result.settings && result.settings.autoRefresh) {
      setupAutoRefresh(result.settings.autoRefresh);
    }
  });
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  chrome.runtime.sendMessage({ action: command }).catch(() => {
    // No tabs listening
  });
});
