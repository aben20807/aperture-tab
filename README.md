# Aperture Tab

A browser extension that replaces your new tab page with beautiful, high-quality photos from Unsplash, featuring camera EXIF metadata and photographer attribution.

## Features

- Random Unsplash photos with camera EXIF metadata (aperture, shutter speed, ISO, focal length)
- Configurable auto-refresh intervals with background timer support
- Image queue system - prefetches 3-15 images for instant loading
- EXIF filtering - only shows photos with complete camera metadata
- Unlimited history with thumbnail grid view
- Favorites system
- Collection filtering and search functionality
- Keyboard shortcuts for quick access
- Privacy-first - all data stored locally

## Installation

### Get Unsplash API Key

1. Visit [Unsplash Developers](https://unsplash.com/oauth/applications)
2. Click "New Application" and accept the terms
3. Fill in application details (Demo app is fine)
4. Copy your **Access Key** and note your **Application Name**

### Install Extension

1. Clone this repository:
   ```bash
   git clone https://github.com/aben20807/aperture-tab.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked** and select the `aperture-tab` folder
5. Open a new tab, click settings, and enter:
   - Your Unsplash **API key**
   - Your **Application Name** (optional, for Unsplash attribution via UTM parameters)

## Settings

### Auto Refresh Modes

- **Manual** - Images only change when you click the refresh button
- **New image on each tab** - Every new tab shows a different photo
- **Timer-based (30min/1hour/daily/custom)** - Background timer updates the global photo at set intervals. All tabs opened during that interval show the same photo.

### Image Queue

- Queue Size: 3-15 images (default: 5)
- Prefetches and preloads images to browser cache
- Auto-refills when queue drops below 3 images
- Filters out photos without EXIF camera data

### Content Filters

- Search by keywords
- Filter by curated collections (Nature, Architecture, Minimal, Ocean, Forest, Urban, Space, Animals)

### Display Options

- Image Quality: Regular (1080p), Full (original), Raw (highest quality)
- Toggle photographer name and EXIF metadata display

## Keyboard Shortcuts

- `Space` - Refresh image
- `Ctrl+Shift+H` - Toggle history panel
- `Ctrl+Shift+F` - Toggle favorite
- `Ctrl+Shift+R` - Refresh image (alternative)
- `Esc` - Close history panel

## Architecture

### Key Components

- **newtab.js** - Main application logic, photo loading, queue management
- **background.js** - Service worker handling timer alarms and global state
- **settings.js/html** - Settings interface and preferences management
- **lib/unsplash-api.js** - Unsplash API wrapper with EXIF formatting
- **manifest.json** - Chrome extension configuration (Manifest V3)

### How It Works

1. Each tab has a unique `tabId` and maintains its own `currentPhoto`
2. `sessionStorage` detects F5 refresh vs new tab
3. Background service worker manages alarms and updates `lastGlobalPhoto`
4. Image queue prefetches and caches images, filtered for EXIF metadata
5. EXIF filtering fetches 3x needed images to ensure quality photos

### Storage

- **chrome.storage.local** - Settings, history, favorites, lastGlobalPhoto, imageQueue
- **sessionStorage** - Per-tab state (persists across F5, cleared when tab closes)
- **Browser cache** - Preloaded queue images for instant display

## Development

### Tech Stack

- Chrome Manifest V3
- Vanilla JavaScript (ES6+)
- Unsplash API
- Chrome Storage API
- Chrome Alarms API

### Debug Mode

To enable console logging for development:

1. Open the JavaScript files (newtab.js, background.js, settings.js, lib/unsplash-api.js)
2. Change `const DEBUG = false;` to `const DEBUG = true;` at the top of each file
3. Reload the extension
4. Console logs will now appear in the browser console (F12)

Note: Error messages are always logged regardless of debug mode.

## Troubleshooting

**Images not loading?**

- Verify API key in settings
- Check browser console for errors (F12)
- Unsplash demo apps limited to 50 requests/hour

**Same image on all tabs?**

- Expected behavior for timer modes (manual, 30min, 1hour, daily, custom)
- Use "New image on each tab" mode for different images per tab

**Extension not working?**

- Check `chrome://extensions/` - ensure extension is enabled
- Try reloading the extension

**Queue not refilling?**

- Might be hitting Unsplash API rate limits
- Reduce queue size in settings (default: 5)
- Wait for rate limit reset (1 hour)

## Permissions

This extension requires the following Chrome permissions:

- **storage** - Store settings, history, favorites, and image queue locally on your device
- **alarms** - Run background timers for auto-refresh intervals (30min, 1hour, daily, custom)

All data remains on your device. No information is sent to external servers except API requests to Unsplash.

## Similar Extensions

If you're looking for alternatives, here are some popular Unsplash-based new tab extensions:

- [Unsplash Instant](https://chromewebstore.google.com/detail/unsplash-instant/embphhnhnpokdhfdmgjfdppdapaedlgk)
- [Unsplash Instant Reborn](https://chromewebstore.google.com/detail/unsplash-instant-reborn/nhielejgoepolmhbgbhfiijgniefalki)
- [Unsplash Wanderer](https://chromewebstore.google.com/detail/unsplash-wanderer/jdjjjnfdkhpdppedhjgdcecmmcmklopm)
- [Unsplash New Tab](https://chromewebstore.google.com/detail/unsplash-new-tab/endjkljkojbohljcecpclkbiocdikhce)

**What makes Aperture Tab different:**

- **EXIF Metadata Focus** - Shows detailed camera settings (aperture, shutter speed, ISO, focal length)
- **EXIF Filtering** - Only displays photos with complete camera metadata
- **Configurable Queue System** - Prefetch 3-15 images with browser cache preloading
- **Custom Timer Intervals** - Set any interval from 1-1440 minutes
- **Privacy-First** - No telemetry, no external servers, all data stored locally
- **Open Source** - Full transparency and customization

## License

Apache 2.0 License - see [LICENSE](LICENSE) file for details.

Photos provided by Unsplash photographers under the [Unsplash License](https://unsplash.com/license).

## Credits

- [Unsplash](https://unsplash.com) for the amazing photos
- [Unsplash API](https://unsplash.com/developers) for the service

---

**Note**:

- This extension requires a free Unsplash API key. Your API key is stored locally and never transmitted to any server except Unsplash's official API.
- This extension was developed with substantial assistance from GitHub Copilot (Claude Sonnet 4.5) and refined through human feedback.
