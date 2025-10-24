// Aperture Tab - Main Script

// State management
let currentPhoto = null;
let settings = null;
let unsplashAPI = null;
let history = [];
let favorites = [];
let refreshTimer = null;
let imageQueue = [];
let isRefilling = false; // Prevent multiple refill operations
let tabId = null; // Unique ID for this tab instance
let isInitialLoad = true; // Track if this is the first load for this tab

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
    console.log('Initializing Aperture Tab...');
    
    // Generate unique tab ID for this instance (reuse if exists in sessionStorage)
    let storedTabData = null;
    try {
      storedTabData = sessionStorage.getItem('apertureTabData');
      if (storedTabData) {
        storedTabData = JSON.parse(storedTabData);
        console.log('Found existing tab data in sessionStorage');
      }
    } catch (e) {
      console.log('No existing tab data found');
    }
    
    if (storedTabData && storedTabData.tabId) {
      // This is a browser refresh - reuse the same tab ID and photo
      tabId = storedTabData.tabId;
      isInitialLoad = false; // Not initial load, it's a refresh
      console.log('Browser refresh detected, reusing Tab ID:', tabId);
    } else {
      // This is a new tab
      tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      isInitialLoad = true;
      console.log('New tab, Tab ID:', tabId);
    }
    
    // Load settings and data from storage
    const data = await chrome.storage.local.get(['settings', 'history', 'favorites', 'lastGlobalPhoto', 'imageQueue']);
    settings = data.settings || await getDefaultSettings();
    history = data.history || [];
    favorites = data.favorites || [];
    imageQueue = data.imageQueue || [];
    
    console.log('Settings loaded:', settings);
    console.log('Image queue size:', imageQueue.length);
    
    // Get API key from settings
    if (!settings.apiKey) {
      console.log('No API key found in settings');
      showError('Please set your Unsplash API key in settings');
      return;
    }
    
    console.log('API key found, initializing API...');
    
    // Initialize Unsplash API
    unsplashAPI = new UnsplashAPI(settings.apiKey);
    
    // Preload existing queued images to browser cache
    if (imageQueue.length > 0) {
      console.log(`Preloading ${imageQueue.length} existing queued images...`);
      preloadQueuedImages(imageQueue);
    }
    
    // Refill queue if needed (in background)
    if (imageQueue.length < 3) {
      console.log('Queue low, refilling...');
      refillQueue().catch(err => console.error('Error refilling queue:', err));
    }
    
    // Decide whether to load a new image or reuse existing
    if (storedTabData && storedTabData.currentPhoto) {
      // Browser refresh - reuse the same photo
      console.log('Browser refresh - reusing previous photo');
      currentPhoto = storedTabData.currentPhoto;
      displayPhoto(currentPhoto);
    } else if (isInitialLoad) {
      // New tab - behavior depends on mode
      if (settings.autoRefresh === 'newtab') {
        // Only in 'newtab' mode do we load a new image on each tab
        console.log('Newtab mode - loading new photo...');
        await loadNewPhoto();
      } else if (data.lastGlobalPhoto) {
        // For manual and timer modes, always show the current global photo
        // Timer updates are handled by background.js alarms, not here
        console.log('Using current global photo...');
        currentPhoto = data.lastGlobalPhoto;
        displayPhoto(currentPhoto);
        saveTabDataToSession(); // Persist to sessionStorage
      } else {
        // No photo exists yet, load the first one
        console.log('No existing photo - loading first photo...');
        await loadNewPhoto();
      }
    }
    
    // Save tab data to sessionStorage (persists across browser refresh, cleared when tab closes)
    saveTabDataToSession();
    
    // Mark that initial load is complete
    isInitialLoad = false;
    
    // Setup event listeners
    setupEventListeners();
    
    // DON'T start auto-refresh timer - we only check time on new tab open
    // startAutoRefreshTimer();
    
    // Listen for messages from background script (only for explicit commands)
    chrome.runtime.onMessage.addListener(handleMessage);
    
    console.log('Initialization complete');
    
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to initialize extension: ' + error.message);
  }
}

// Get default settings
async function getDefaultSettings() {
  const defaultSettings = {
    apiKey: '',
    autoRefresh: 'manual',
    customInterval: 60,
    imageQuality: 'regular', // Use regular for faster loading
    collections: [],
    searchQuery: '',
    showInfo: true,
    queueSize: 5 // Reduced from 10 to avoid rate limits
  };
  await chrome.storage.local.set({ settings: defaultSettings });
  return defaultSettings;
}

// Save tab data to sessionStorage (persists across browser refresh)
function saveTabDataToSession() {
  if (!currentPhoto) return;
  
  const tabData = {
    tabId: tabId,
    currentPhoto: currentPhoto
  };
  
  try {
    sessionStorage.setItem('apertureTabData', JSON.stringify(tabData));
    console.log('Saved tab data to sessionStorage');
  } catch (e) {
    console.error('Error saving to sessionStorage:', e);
  }
}

// Check if we should refresh based on auto-refresh settings (only when opening NEW tab)
function shouldRefreshOnNewTab(savedPhoto) {
  // If newtab mode, always load new image
  if (settings.autoRefresh === 'newtab') {
    return true;
  }
  
  // If manual mode, never auto-refresh
  if (settings.autoRefresh === 'manual') {
    return false;
  }
  
  // If no saved photo exists, load new one
  if (!savedPhoto) {
    return true;
  }
  
  // Check timestamp for timer-based modes
  const lastUpdate = savedPhoto.timestamp || 0;
  const now = Date.now();
  const diff = now - lastUpdate;
  
  let intervalMs;
  switch (settings.autoRefresh) {
    case '30min':
      intervalMs = 30 * 60 * 1000;
      break;
    case '1hour':
      intervalMs = 60 * 60 * 1000;
      break;
    case 'daily':
      intervalMs = 24 * 60 * 60 * 1000;
      break;
    case 'custom':
      const customMinutes = settings.customInterval || 60;
      intervalMs = customMinutes * 60 * 1000;
      break;
    default:
      return false;
  }
  
  const shouldRefresh = diff >= intervalMs;
  console.log(`Timer check: last update ${new Date(lastUpdate).toLocaleTimeString()}, now ${new Date(now).toLocaleTimeString()}, diff ${Math.floor(diff/1000)}s, interval ${Math.floor(intervalMs/1000)}s, refresh: ${shouldRefresh}`);
  
  return shouldRefresh;
}

// Check if we should refresh based on auto-refresh settings (for background timer)
function shouldRefresh() {
  if (!currentPhoto || settings.autoRefresh === 'manual' || settings.autoRefresh === 'newtab') return false;
  
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
    case 'custom':
      const customMinutes = settings.customInterval || 60;
      return diff > customMinutes * 60 * 1000;
    default:
      return false;
  }
}

// Start auto-refresh timer
function startAutoRefreshTimer() {
  // Clear any existing timer
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  
  // Don't start timer for manual or newtab modes
  if (settings.autoRefresh === 'manual' || settings.autoRefresh === 'newtab') {
    return;
  }
  
  // Calculate check interval (check every minute)
  const checkInterval = 60 * 1000; // 1 minute
  
  refreshTimer = setInterval(() => {
    if (shouldRefresh()) {
      console.log('Auto-refresh triggered');
      loadNewPhoto();
    }
  }, checkInterval);
  
  console.log('Auto-refresh timer started for mode:', settings.autoRefresh);
}

// Refill the image queue
async function refillQueue() {
  if (isRefilling) {
    console.log('Already refilling queue, skipping...');
    return;
  }
  
  isRefilling = true;
  
  try {
    const queueSize = settings.queueSize || 10;
    const needed = queueSize - imageQueue.length;
    
    if (needed <= 0) {
      console.log('Queue is full, no refill needed');
      isRefilling = false;
      return;
    }
    
    console.log(`Fetching ${needed} images to refill queue...`);
    
    const options = {};
    if (settings.collections && settings.collections.length > 0) {
      options.collections = settings.collections;
    }
    if (settings.searchQuery) {
      options.query = settings.searchQuery;
    }
    
    // Fetch more photos than needed to account for filtering
    const fetchCount = Math.min(needed * 3, 30); // Fetch 3x to ensure we have enough after filtering
    const photos = await unsplashAPI.getMultipleRandomPhotos(fetchCount, options);
    console.log(`Fetched ${photos.length} photos`);
    
    const formattedPhotos = photos.map(photo => unsplashAPI.formatPhotoData(photo));
    
    // Filter out photos without EXIF info (must have model or make)
    const photosWithExif = formattedPhotos.filter(photo => {
      const hasExif = photo.exif && Object.keys(photo.exif).length > 0;
      const hasCameraInfo = photo.exif && (photo.exif.model || photo.exif.make);
      if (!hasExif) {
        console.log(`Filtered out photo ${photo.id} - no EXIF data`);
      } else if (!hasCameraInfo) {
        console.log(`Filtered out photo ${photo.id} - no camera model/make`);
      }
      return hasExif && hasCameraInfo;
    });
    
    console.log(`After filtering: ${photosWithExif.length} photos with camera EXIF data`);
    
    // Take only what we need
    const photosToAdd = photosWithExif.slice(0, needed);
    imageQueue.push(...photosToAdd);
    
    // Save queue to storage
    await chrome.storage.local.set({ imageQueue });
    console.log(`Queue refilled. New size: ${imageQueue.length}`);
    
    // Preload images in background to cache them
    console.log('Preloading images to browser cache...');
    preloadQueuedImages(photosToAdd);
    
  } catch (error) {
    console.error('Error refilling queue:', error);
  } finally {
    isRefilling = false;
  }
}

// Preload images to browser cache
function preloadQueuedImages(photos) {
  photos.forEach((photo, index) => {
    const imageUrl = photo.urls[settings.imageQuality] || photo.urls.full;
    const img = new Image();
    
    img.onload = () => {
      console.log(`Preloaded image ${index + 1}/${photos.length}`);
    };
    
    img.onerror = () => {
      console.warn(`Failed to preload image ${index + 1}/${photos.length}`);
    };
    
    // Start preloading
    img.src = imageUrl;
  });
}

// Get next photo from queue
function getNextFromQueue() {
  if (imageQueue.length === 0) {
    console.log('Queue is empty');
    return null;
  }
  
  const photo = imageQueue.shift();
  console.log(`Photo taken from queue. Remaining: ${imageQueue.length}`);
  
  // Save updated queue
  chrome.storage.local.set({ imageQueue });
  
  // Refill queue if running low (async, don't wait)
  if (imageQueue.length < 3) {
    console.log('Queue running low, refilling in background...');
    refillQueue().catch(err => console.error('Background refill failed:', err));
  }
  
  return photo;
}

// Load a new random photo
async function loadNewPhoto() {
  console.log('loadNewPhoto called');
  console.log('Current photo ID before:', currentPhoto?.id);
  showLoading(true);
  hideError();
  
  try {
    // Try to get photo from queue first
    let photo = getNextFromQueue();
    
    if (photo) {
      console.log('Using photo from queue, ID:', photo.id);
      currentPhoto = photo;
    } else {
      console.log('Queue empty, fetching directly from API...');
      
      const options = {};
      
      if (settings.collections && settings.collections.length > 0) {
        options.collections = settings.collections;
        console.log('Using collections:', settings.collections);
      }
      
      if (settings.searchQuery) {
        options.query = settings.searchQuery;
        console.log('Using search query:', settings.searchQuery);
      }
      
      console.log('Fetching photo from Unsplash API...');
      
      // Keep fetching until we get one with EXIF data
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const rawPhoto = await unsplashAPI.getRandomPhoto(options);
        console.log('Photo received:', rawPhoto);
        
        const formattedPhoto = unsplashAPI.formatPhotoData(rawPhoto);
        
        // Check if it has EXIF data with camera model or make
        const hasExif = formattedPhoto.exif && Object.keys(formattedPhoto.exif).length > 0;
        const hasCameraInfo = formattedPhoto.exif && (formattedPhoto.exif.model || formattedPhoto.exif.make);
        
        if (hasExif && hasCameraInfo) {
          currentPhoto = formattedPhoto;
          console.log('Formatted photo data with camera EXIF:', currentPhoto);
          break;
        } else {
          if (!hasExif) {
            console.log(`Photo ${formattedPhoto.id} has no EXIF data, fetching another... (attempt ${attempts + 1}/${maxAttempts})`);
          } else {
            console.log(`Photo ${formattedPhoto.id} has no camera model/make, fetching another... (attempt ${attempts + 1}/${maxAttempts})`);
          }
          attempts++;
        }
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('Could not find a photo with camera EXIF data after multiple attempts');
      }
      
      // Start refilling queue in background
      refillQueue().catch(err => console.error('Error refilling queue:', err));
    }
    
    console.log('New photo ID:', currentPhoto.id);
    
    // Save to history
    await addToHistory(currentPhoto);
    
    // Display the photo
    displayPhoto(currentPhoto);
    
    // Save tab data to sessionStorage (persists across browser refresh)
    saveTabDataToSession();
    
    // Save as last global photo (for new tabs to reference)
    await chrome.storage.local.set({ lastGlobalPhoto: currentPhoto });
    
    showLoading(false);
    
  } catch (error) {
    console.error('Error loading photo:', error);
    showError('Failed to load image. Please try again.');
    showLoading(false);
  }
}

// Display a photo
function displayPhoto(photo) {
  console.log('displayPhoto called with:', photo);
  console.log('Photo ID:', photo?.id);
  if (!photo) {
    console.error('No photo provided to displayPhoto');
    return;
  }
  
  const imageUrl = photo.urls[settings.imageQuality] || photo.urls.full;
  console.log('Image URL:', imageUrl);
  console.log('Image quality setting:', settings.imageQuality);
  console.log('Current img src:', elements.mainImage.src);
  
  // Ensure image element is visible
  elements.mainImage.style.display = 'block';
  
  // Add a small fade-out effect
  elements.mainImage.style.opacity = '0.3';
  
  // Remove old event handlers to prevent conflicts
  elements.mainImage.onload = null;
  elements.mainImage.onerror = null;
  
  // Add new event handlers
  elements.mainImage.onload = () => {
    console.log('Main image element loaded successfully');
    elements.mainImage.style.opacity = '1';
    elements.mainImage.classList.add('loaded');
  };
  
  elements.mainImage.onerror = (e) => {
    console.error('Main image element failed to load', e);
    elements.mainImage.style.opacity = '1';
    // Don't show error for rate limit - just keep current image
    console.warn('Image load failed - possibly rate limited. Keeping current image.');
  };
  
  // Don't use cache-busting - let browser cache work properly
  // The image URL from Unsplash already has unique parameters
  console.log('Setting new src to:', imageUrl);
  elements.mainImage.src = imageUrl;
  console.log('Image src after setting:', elements.mainImage.src);
  
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
      saveTabDataToSession(); // Persist to sessionStorage for browser refresh
      elements.historyPanel.classList.add('hidden');
      // Don't update global storage - keep this tab's image independent
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
  // Only handle explicit user actions, not automatic updates
  if (message.action === 'refresh-image') {
    loadNewPhoto();
  } else if (message.action === 'toggle-history') {
    toggleHistory();
  } else if (message.action === 'toggle-favorite') {
    toggleFavorite();
  } else if (message.action === 'photoUpdated') {
    // Background script updated the global photo (timer expired)
    // We don't auto-update this tab's image - it stays as is
    // Only new tabs or refresh button will show the new image
    console.log('Background updated global photo (timer expired)');
  }
  // Ignore other messages - don't let other tabs change this tab's image
}

// Show/hide loading indicator
function showLoading(show) {
  elements.loadingIndicator.style.display = show ? 'flex' : 'none';
}

// Show error message
function showError(message) {
  console.log('Error:', message);
  showLoading(false); // Hide loading indicator
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
