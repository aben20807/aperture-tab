# Changelog

All notable changes to Aperture Tab will be documented in this file.

## [1.1.0] - 2025-10-25

### Added
- **Custom Interval Timer**: Set auto-refresh interval from 1-1440 minutes
- **EXIF Metadata Filtering**: Only display photos with complete camera information (make/model required)
- **Tab Independence**: Each tab maintains its own image independently
- **Browser Refresh Persistence**: Images persist across F5/Ctrl+R using sessionStorage
- **Image Queue System**: Prefetch 3-15 images with configurable queue size
- **Background Timer Service**: Service worker handles timer logic via Chrome alarms API
- **Demo Photo**: Beautiful mushroom photo displayed when no API key is set
- **Queue Size Configuration**: Adjustable queue size in settings (3-15 images, default: 5)

### Changed
- **Timer Behavior**: Timer modes now update global photo in background, all tabs show same image until timer expires
- **New Tab Logic**: 
  - Manual mode: Always shows current global photo
  - Newtab mode: Always loads new photo for each tab
  - Timer modes: Shows current global photo, background updates when timer fires
- **EXIF Requirement**: Photos without camera make or model are filtered out
- **Queue Prefetch Strategy**: Fetches 3x needed images to ensure enough photos after EXIF filtering
- **Image Preloading**: Queue images preloaded to browser cache for instant display

### Fixed
- **Race Condition**: Fixed multiple tabs loading different images when opened simultaneously
- **Timer Not Working**: Custom interval timer now properly updates photos at set intervals
- **Refresh Button**: Fixed issue where refresh button wasn't changing images
- **Browser Refresh Behavior**: F5 now keeps same image, only refresh button changes it
- **API Rate Limiting**: Optimized to reduce Unsplash API calls and avoid 429 errors
- **Settings UI**: Improved number input styling for custom interval and queue size

### Technical
- Implemented atomic timer updates via background service worker
- Added sessionStorage for per-tab state persistence
- Removed client-side timer checking to prevent race conditions
- Background alarms handle all timer-based photo updates
- Queue management with automatic refill when below threshold

## [1.0.0] - Initial Release

### Features
- Random Unsplash photos on new tab
- Manual refresh button
- Auto-refresh intervals (30min, 1hour, daily)
- History panel with thumbnails
- Favorites system
- Collection filtering
- Search functionality
- EXIF metadata display (camera, settings)
- Keyboard shortcuts
- Local storage for history and favorites
- Image quality settings
- Photographer attribution

---

## Version Numbering

- **Major**: Breaking changes or major feature additions
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, minor improvements
