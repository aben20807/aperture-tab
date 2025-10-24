// Aperture Tab - Main Script

// State management
let currentPhoto = null;
let settings = null;
let unsplashAPI = null;
let history = [];
let favorites = [];

// DOM elements
const elements = {
  mainImage: document.getElementById('mainImage'),
  imageContainer: document.getElementById('imageContainer'),
  loadingIndicator: document.getElementById('loadingIndicator'),
  errorMessage: document.getElementById('errorMessage'),
  imageInfo: document.getElementById('imageInfo'),
  photographerLink: document.getElementById('photographerLink'),
  imageLocation: document.getElementById('imageLocation'),
  cameraInfo: document.getElementById('cameraInfo'),
  refreshBtn: document.getElementById('refreshBtn'),
  favoriteBtn: document.getElementById('favoriteBtn'),
  viewOnUnsplashBtn: document.getElementById('viewOnUnsplashBtn'),
  historyBtn: document.getElementById('historyBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  retryBtn: document.getElementById('retryBtn'),
  historyPanel: document.getElementById('historyPanel'),
  closeHistoryBtn: document.getElementById('closeHistoryBtn'),
  historyGrid: document.getElementById('historyGrid')
};

// Initialize the extension
async function init() {
  try {
    // Load settings and data from storage
    const data = await chrome.storage.local.get(['settings', 'history', 'favorites', 'currentPhoto']);
    settings = data.settings || await getDefaultSettings();
    history = data.history || [];
    favorites = data.favorites || [];
    
    // Get API key from settings
    if (!settings.apiKey) {
      showError('Please set your Unsplash API key in settings');
      return;
    }
    
    // Initialize Unsplash API
    unsplashAPI = new UnsplashAPI(settings.apiKey);
    
    // Load current photo or fetch a new one
    if (data.currentPhoto && !shouldRefresh()) {
      currentPhoto = data.currentPhoto;
      displayPhoto(currentPhoto);
    } else {
      await loadNewPhoto();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);
    
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to initialize extension');
  }
}

// Get default settings
async function getDefaultSettings() {
  const defaultSettings = {
    apiKey: '',
    autoRefresh: 'manual',
    imageQuality: 'full',
    collections: [],
    searchQuery: '',
    showInfo: true
  };
  await chrome.storage.local.set({ settings: defaultSettings });
  return defaultSettings;
}

// Check if we should refresh based on auto-refresh settings
function shouldRefresh() {
  if (!currentPhoto || settings.autoRefresh === 'manual') return false;
  
  const lastUpdate = currentPhoto.timestamp || 0;
  const now = Date.now();
  const diff = now - lastUpdate;
  
  switch (settings.autoRefresh) {
    case '30min':
      return diff > 30 * 60 * 1000;
    case '1hour':
      return diff > 60 * 60 * 1000;
    case 'daily':
      return diff > 24 * 60 * 60 * 1000;
    default:
      return false;
  }
}

// Load a new random photo
async function loadNewPhoto() {
  showLoading(true);
  hideError();
  
  try {
    const options = {};
    
    if (settings.collections && settings.collections.length > 0) {
      options.collections = settings.collections;
    }
    
    if (settings.searchQuery) {
      options.query = settings.searchQuery;
    }
    
    const photo = await unsplashAPI.getRandomPhoto(options);
    currentPhoto = unsplashAPI.formatPhotoData(photo);
    
    // Save to history
    await addToHistory(currentPhoto);
    
    // Display the photo
    displayPhoto(currentPhoto);
    
    // Save current photo
    await chrome.storage.local.set({ currentPhoto });
    
    showLoading(false);
    
  } catch (error) {
    console.error('Error loading photo:', error);
    showError('Failed to load image. Please try again.');
    showLoading(false);
  }
}

// Display a photo
function displayPhoto(photo) {
  if (!photo) return;
  
  const imageUrl = photo.urls[settings.imageQuality] || photo.urls.full;
  
  // Preload image
  const img = new Image();
  img.onload = () => {
    elements.mainImage.src = imageUrl;
    elements.mainImage.classList.add('loaded');
    elements.mainImage.style.opacity = '0';
    setTimeout(() => {
      elements.mainImage.style.opacity = '1';
    }, 50);
  };
  img.onerror = () => {
    // If image fails to load, hide it completely
    elements.mainImage.style.display = 'none';
    showError('Failed to load image');
  };
  img.src = imageUrl;
  
  // Update image info
  if (settings.showInfo) {
    elements.photographerLink.textContent = photo.user.name;
    elements.photographerLink.href = photo.user.profile;
    
    if (photo.location && photo.location.name) {
      elements.imageLocation.textContent = `📍 ${photo.location.name}`;
      elements.imageLocation.style.display = 'block';
    } else {
      elements.imageLocation.style.display = 'none';
    }
    
    // Display camera gear info
    if (photo.exif && Object.keys(photo.exif).length > 0) {
      const gearParts = [];
      
      // Camera model
      if (photo.exif.model) {
        gearParts.push(`📷 ${photo.exif.model}`);
      } else if (photo.exif.make) {
        gearParts.push(`📷 ${photo.exif.make}`);
      }
      
      // Focal length
      if (photo.exif.focal_length) {
        gearParts.push(`${photo.exif.focal_length}`);
      }
      
      // Aperture
      if (photo.exif.aperture) {
        gearParts.push(`ƒ/${photo.exif.aperture}`);
      }
      
      // Shutter speed
      if (photo.exif.exposure_time) {
        gearParts.push(`${photo.exif.exposure_time}s`);
      }
      
      // ISO
      if (photo.exif.iso) {
        gearParts.push(`ISO ${photo.exif.iso}`);
      }
      
      if (gearParts.length > 0) {
        elements.cameraInfo.innerHTML = gearParts.map(part => 
          `<span class="gear-item">${part}</span>`
        ).join('');
        elements.cameraInfo.style.display = 'block';
      } else {
        elements.cameraInfo.style.display = 'none';
      }
    } else {
      elements.cameraInfo.style.display = 'none';
    }
    
    elements.imageInfo.style.display = 'block';
  } else {
    elements.imageInfo.style.display = 'none';
  }
  
  // Update favorite button state
  updateFavoriteButton();
}

// Add photo to history
async function addToHistory(photo) {
  // Check if already in history
  const existingIndex = history.findIndex(p => p.id === photo.id);
  if (existingIndex !== -1) {
    history.splice(existingIndex, 1);
  }
  
  // Add to beginning of history
  history.unshift(photo);
  
  // Keep only last 500 items
  if (history.length > 500) {
    history = history.slice(0, 500);
  }
  
  await chrome.storage.local.set({ history });
}

// Toggle favorite status
async function toggleFavorite() {
  if (!currentPhoto) return;
  
  const index = favorites.findIndex(p => p.id === currentPhoto.id);
  
  if (index !== -1) {
    // Remove from favorites
    favorites.splice(index, 1);
  } else {
    // Add to favorites
    favorites.unshift(currentPhoto);
  }
  
  await chrome.storage.local.set({ favorites });
  updateFavoriteButton();
  
  // Update history panel if open
  if (!elements.historyPanel.classList.contains('hidden')) {
    renderHistory();
  }
}

// Update favorite button appearance
function updateFavoriteButton() {
  if (!currentPhoto) return;
  
  const isFavorite = favorites.some(p => p.id === currentPhoto.id);
  
  if (isFavorite) {
    elements.favoriteBtn.classList.add('active');
    elements.favoriteBtn.querySelector('svg').style.fill = 'currentColor';
  } else {
    elements.favoriteBtn.classList.remove('active');
    elements.favoriteBtn.querySelector('svg').style.fill = 'none';
  }
}

// Open current image on Unsplash website
function viewOnUnsplash() {
  if (!currentPhoto) return;
  
  // Open the image page on Unsplash
  const unsplashUrl = currentPhoto.links.html;
  window.open(unsplashUrl, '_blank');
}

// Toggle history panel
function toggleHistory() {
  const isHidden = elements.historyPanel.classList.contains('hidden');
  
  if (isHidden) {
    elements.historyPanel.classList.remove('hidden');
    renderHistory();
  } else {
    elements.historyPanel.classList.add('hidden');
  }
}

// Render history grid
function renderHistory(filter = 'all') {
  const items = filter === 'favorites' ? favorites : history;
  
  elements.historyGrid.innerHTML = '';
  
  if (items.length === 0) {
    elements.historyGrid.innerHTML = '<p class="empty-message">No images yet</p>';
    return;
  }
  
  items.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'history-card';
    
    const img = document.createElement('img');
    img.src = photo.urls.thumb;
    img.alt = photo.description || 'Unsplash image';
    
    const overlay = document.createElement('div');
    overlay.className = 'history-card-overlay';
    
    const info = document.createElement('div');
    info.className = 'history-card-info';
    info.textContent = photo.user.name;
    
    overlay.appendChild(info);
    card.appendChild(img);
    card.appendChild(overlay);
    
    // Click to load this image
    card.addEventListener('click', () => {
      currentPhoto = photo;
      displayPhoto(photo);
      elements.historyPanel.classList.add('hidden');
      chrome.storage.local.set({ currentPhoto });
    });
    
    elements.historyGrid.appendChild(card);
  });
}

// Setup event listeners
function setupEventListeners() {
  console.log('Setting up event listeners...');
  console.log('Settings button element:', elements.settingsBtn);
  
  elements.refreshBtn.addEventListener('click', loadNewPhoto);
  elements.favoriteBtn.addEventListener('click', toggleFavorite);
  elements.viewOnUnsplashBtn.addEventListener('click', viewOnUnsplash);
  elements.historyBtn.addEventListener('click', toggleHistory);
  elements.closeHistoryBtn.addEventListener('click', () => {
    elements.historyPanel.classList.add('hidden');
  });
  elements.retryBtn.addEventListener('click', loadNewPhoto);
  
  // Settings button - simple direct approach
  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener('click', function(e) {
      console.log('Settings clicked!');
      e.preventDefault();
      e.stopPropagation();
      
      const settingsUrl = chrome.runtime.getURL('settings.html');
      console.log('Opening:', settingsUrl);
      
      // Use window.open - simplest approach
      const win = window.open(settingsUrl, '_blank');
      if (!win) {
        console.error('Popup blocked');
        alert('Settings page blocked. Please allow popups or right-click the extension icon and choose Options.');
      }
    });
    console.log('Settings button listener attached successfully');
  } else {
    console.error('Settings button not found!');
  }
  
  // History tabs
  document.querySelectorAll('.history-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      renderHistory(e.target.dataset.tab);
    });
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Don't trigger if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.code === 'Space') {
      e.preventDefault();
      loadNewPhoto();
    } else if (e.ctrlKey && e.shiftKey && e.code === 'KeyH') {
      e.preventDefault();
      toggleHistory();
    } else if (e.ctrlKey && e.shiftKey && e.code === 'KeyF') {
      e.preventDefault();
      toggleFavorite();
    } else if (e.ctrlKey && e.shiftKey && e.code === 'KeyR') {
      e.preventDefault();
      loadNewPhoto();
    } else if (e.code === 'Escape') {
      elements.historyPanel.classList.add('hidden');
    }
  });
}

// Handle messages from background script
function handleMessage(message, sender, sendResponse) {
  if (message.action === 'autoRefresh' || message.action === 'refresh-image') {
    loadNewPhoto();
  } else if (message.action === 'toggle-history') {
    toggleHistory();
  } else if (message.action === 'toggle-favorite') {
    toggleFavorite();
  }
}

// Show/hide loading indicator
function showLoading(show) {
  elements.loadingIndicator.style.display = show ? 'flex' : 'none';
}

// Show error message
function showError(message) {
  elements.errorMessage.querySelector('p').textContent = message;
  elements.errorMessage.classList.remove('hidden');
}

// Hide error message
function hideError() {
  elements.errorMessage.classList.add('hidden');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Additional failsafe: directly attach settings handler after a short delay
setTimeout(() => {
  const btn = document.getElementById('settingsBtn');
  if (btn) {
    console.log('Failsafe: Settings button found, adding backup listener');
    btn.onclick = function() {
      console.log('Failsafe handler triggered');
      window.open(chrome.runtime.getURL('settings.html'), '_blank');
    };
  } else {
    console.error('Failsafe: Settings button not found');
  }
}, 100);
