// Background Service Worker for Aperture Tab Extension

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Aperture Tab Extension installed');
  
  // Set default settings
  const defaultSettings = {
    autoRefresh: 'manual', // manual, newtab, 30min, 1hour, daily, custom
    customInterval: 60, // Custom interval in minutes
    queueSize: 10, // Number of images to prefetch
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
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'autoRefresh') {
    console.log('Auto-refresh alarm triggered, loading new photo...');
    
    // Get settings and load a new photo
    const data = await chrome.storage.local.get(['settings', 'imageQueue']);
    const settings = data.settings;
    const imageQueue = data.imageQueue || [];
    
    if (!settings || !settings.apiKey) {
      console.log('No API key, skipping auto-refresh');
      return;
    }
    
    // Get next photo from queue
    let photo = null;
    if (imageQueue.length > 0) {
      photo = imageQueue.shift();
      await chrome.storage.local.set({ imageQueue });
      console.log('Using photo from queue, remaining:', imageQueue.length);
    }
    
    if (photo) {
      // Save as new global photo with current timestamp
      photo.timestamp = Date.now();
      await chrome.storage.local.set({ lastGlobalPhoto: photo });
      console.log('Updated lastGlobalPhoto from queue');
      
      // Notify all tabs to update (they should reload from storage)
      chrome.runtime.sendMessage({ action: 'photoUpdated' }).catch(() => {
        // No tabs listening, that's okay
      });
    } else {
      console.log('Queue empty, tabs will fetch on next open');
    }
  }
});

// Set up auto-refresh alarm based on settings
function setupAutoRefresh(settings) {
  chrome.alarms.clear('autoRefresh', () => {
    const interval = settings.autoRefresh;
    
    // Don't set alarm for manual or newtab modes
    if (interval === 'manual' || interval === 'newtab') return;
    
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
      case 'custom':
        minutes = settings.customInterval || 60;
        break;
      default:
        return;
    }
    
    chrome.alarms.create('autoRefresh', {
      periodInMinutes: minutes
    });
    
    console.log('Auto-refresh alarm set for', minutes, 'minutes');
  });
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.settings) {
    const newSettings = changes.settings.newValue;
    if (newSettings) {
      setupAutoRefresh(newSettings);
    }
  }
});

// Initialize auto-refresh on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get('settings', (result) => {
    if (result.settings) {
      setupAutoRefresh(result.settings);
    }
  });
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  chrome.runtime.sendMessage({ action: command }).catch(() => {
    // No tabs listening
  });
});
