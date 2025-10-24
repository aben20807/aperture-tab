# Aperture Tab - Copilot Instructions

## Project Overview
Aperture Tab is a Chrome extension (Manifest V3) that replaces the new tab page with random beautiful Unsplash images.

## Key Features
- Random Unsplash images on new tabs
- Unlimited local history storage
- Quick refresh functionality
- Favorites system
- Auto-refresh intervals
- Collection/topic browsing
- Search functionality
- Keyboard shortcuts
- History panel with thumbnails
- Image download capability

## Technology Stack
- Manifest V3
- Unsplash API
- Chrome Storage API
- Vanilla JavaScript (ES6+)
- Modern CSS3
- HTML5

## File Structure
- manifest.json: Extension configuration
- newtab.html/js/css: Main new tab interface
- background.js: Service worker
- settings.html/js/css: Settings interface
- lib/unsplash-api.js: API wrapper
- icons/: Extension icons (16, 48, 128px)

## Development Guidelines
- Use async/await for API calls
- Store data in chrome.storage.local (unlimited)
- Implement error handling for API failures
- Use CSS Grid/Flexbox for responsive design
- Follow Chrome extension best practices
- Ensure keyboard accessibility
