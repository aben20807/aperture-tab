// Aperture Tab - Settings Script

// Note: DEBUG flag is defined in newtab.js, but settings.js loads independently
const DEBUG = false; // Set to true to enable console logging

// Debug logger
const settingsLog = {
  info: (...args) => DEBUG && console.info('[Settings]', ...args),
  warn: (...args) => DEBUG && console.warn('[Settings]', ...args),
  error: (...args) => console.error('[Settings]', ...args)
};

let settings = null;
let history = [];
let favorites = [];

// DOM elements
const elements = {
  apiKey: document.getElementById('apiKey'),
  toggleApiKey: document.getElementById('toggleApiKey'),
  imageQuality: document.getElementById('imageQuality'),
  showInfo: document.getElementById('showInfo'),
  autoRefresh: document.getElementById('autoRefresh'),
  customInterval: document.getElementById('customInterval'),
  customIntervalContainer: document.getElementById('customIntervalContainer'),
  queueSize: document.getElementById('queueSize'),
  searchQuery: document.getElementById('searchQuery'),
  collectionCheckboxes: document.querySelectorAll('.collection-checkbox'),
  historyCount: document.getElementById('historyCount'),
  favoritesCount: document.getElementById('favoritesCount'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  clearFavoritesBtn: document.getElementById('clearFavoritesBtn'),
  exportDataBtn: document.getElementById('exportDataBtn'),
  saveBtn: document.getElementById('saveBtn'),
  saveStatus: document.getElementById('saveStatus')
};

// Initialize settings page
async function init() {
  try {
    // Load current settings
    const data = await chrome.storage.local.get(['settings', 'history', 'favorites']);
    
    settings = data.settings || getDefaultSettings();
    history = data.history || [];
    favorites = data.favorites || [];
    
    // Populate form with current settings
    populateForm();
    
    // Update stats
    updateStats();
    
    // Setup event listeners
    setupEventListeners();
    
  } catch (error) {
    settingsLog.error('Error initializing settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

// Get default settings
function getDefaultSettings() {
  return {
    apiKey: '',
    autoRefresh: 'manual',
    customInterval: 60,
    queueSize: 5,
    imageQuality: 'full',
    collections: [],
    searchQuery: '',
    showInfo: true
  };
}

// Populate form with current settings
function populateForm() {
  elements.apiKey.value = settings.apiKey || '';
  elements.imageQuality.value = settings.imageQuality || 'full';
  elements.showInfo.checked = settings.showInfo !== false;
  elements.autoRefresh.value = settings.autoRefresh || 'manual';
  elements.customInterval.value = settings.customInterval || 60;
  elements.queueSize.value = settings.queueSize || 10;
  elements.searchQuery.value = settings.searchQuery || '';
  
  // Show/hide custom interval input
  toggleCustomInterval();
  
  // Set collection checkboxes
  if (settings.collections && settings.collections.length > 0) {
    elements.collectionCheckboxes.forEach(checkbox => {
      checkbox.checked = settings.collections.includes(checkbox.value);
    });
  }
}

// Update statistics
function updateStats() {
  elements.historyCount.textContent = history.length;
  elements.favoritesCount.textContent = favorites.length;
}

// Setup event listeners
function setupEventListeners() {
  elements.saveBtn.addEventListener('click', saveSettings);
  elements.clearHistoryBtn.addEventListener('click', clearHistory);
  elements.clearFavoritesBtn.addEventListener('click', clearFavorites);
  elements.exportDataBtn.addEventListener('click', exportData);
  
  // Toggle API key visibility
  elements.toggleApiKey.addEventListener('click', toggleApiKeyVisibility);
  
  // Show/hide custom interval input when auto-refresh changes
  elements.autoRefresh.addEventListener('change', toggleCustomInterval);
  
  // Auto-save on certain changes
  elements.apiKey.addEventListener('change', () => {
    showStatus('Remember to save your changes', 'info');
  });
}

// Toggle custom interval visibility
function toggleCustomInterval() {
  if (elements.autoRefresh.value === 'custom') {
    elements.customIntervalContainer.style.display = 'block';
  } else {
    elements.customIntervalContainer.style.display = 'none';
  }
}

// Toggle API key visibility
function toggleApiKeyVisibility() {
  const input = elements.apiKey;
  const eyeSlash = document.getElementById('eyeSlash');
  
  if (input.type === 'password') {
    input.type = 'text';
    eyeSlash.style.display = 'block';
  } else {
    input.type = 'password';
    eyeSlash.style.display = 'none';
  }
}

// Save settings
async function saveSettings() {
  try {
    // Gather form data
    const newSettings = {
      apiKey: elements.apiKey.value.trim(),
      imageQuality: elements.imageQuality.value,
      showInfo: elements.showInfo.checked,
      autoRefresh: elements.autoRefresh.value,
      customInterval: parseInt(elements.customInterval.value) || 60,
      queueSize: parseInt(elements.queueSize.value) || 10,
      searchQuery: elements.searchQuery.value.trim(),
      collections: Array.from(elements.collectionCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value)
    };
    
    // Validate API key
    if (!newSettings.apiKey) {
      showStatus('Please enter an API key', 'error');
      elements.apiKey.focus();
      return;
    }
    
    // Validate custom interval
    if (newSettings.autoRefresh === 'custom') {
      if (!newSettings.customInterval || newSettings.customInterval < 1 || newSettings.customInterval > 1440) {
        showStatus('Please enter a valid custom interval (1-1440 minutes)', 'error');
        elements.customInterval.focus();
        return;
      }
    }
    
    // Validate queue size
    if (newSettings.queueSize < 3 || newSettings.queueSize > 15) {
      showStatus('Please enter a valid queue size (3-15)', 'error');
      elements.queueSize.focus();
      return;
    }
    
    // Save to storage
    await chrome.storage.local.set({ settings: newSettings });
    
    settings = newSettings;
    showStatus('Settings saved successfully! ✓', 'success');
    
    // Notify background script and all tabs about settings change
    chrome.runtime.sendMessage({ action: 'settingsUpdated', settings: newSettings }, () => {
      if (chrome.runtime.lastError) {
        settingsLog.info('Background script not listening (this is OK)');
      }
    });
    
    // Also notify all open tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated', settings: newSettings }, () => {
          if (chrome.runtime.lastError) {
            // Ignore errors for tabs that aren't listening
          }
        });
      });
    });
    
  } catch (error) {
    settingsLog.error('Error saving settings:', error);
    showStatus('Error saving settings', 'error');
  }
}

// Clear history
async function clearHistory() {
  if (!confirm('Are you sure you want to clear all history? This cannot be undone.')) {
    return;
  }
  
  try {
    history = [];
    await chrome.storage.local.set({ history: [] });
    updateStats();
    showStatus('History cleared', 'success');
  } catch (error) {
    settingsLog.error('Error clearing history:', error);
    showStatus('Error clearing history', 'error');
  }
}

// Clear favorites
async function clearFavorites() {
  if (!confirm('Are you sure you want to clear all favorites? This cannot be undone.')) {
    return;
  }
  
  try {
    favorites = [];
    await chrome.storage.local.set({ favorites: [] });
    updateStats();
    showStatus('Favorites cleared', 'success');
  } catch (error) {
    settingsLog.error('Error clearing favorites:', error);
    showStatus('Error clearing favorites', 'error');
  }
}

// Export data
async function exportData() {
  try {
    const data = await chrome.storage.local.get(['settings', 'history', 'favorites']);
    
    // Remove API key from export for security
    const exportData = {
      ...data,
      settings: {
        ...data.settings,
        apiKey: '[REDACTED]'
      },
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `aperture-tab-backup-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showStatus('Data exported successfully', 'success');
    
  } catch (error) {
    settingsLog.error('Error exporting data:', error);
    showStatus('Error exporting data', 'error');
  }
}

// Show status message
function showStatus(message, type = 'info') {
  elements.saveStatus.textContent = message;
  elements.saveStatus.className = `save-status ${type}`;
  
  setTimeout(() => {
    elements.saveStatus.textContent = '';
    elements.saveStatus.className = 'save-status';
  }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
