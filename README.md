# Aperture Tab

A browser extension that replaces your new tab page with random high-quality images from Unsplash.

## Features

- Random Unsplash images on every new tab
- Unlimited local history storage
- Favorites system
- Auto-refresh intervals (30min, 1hr, daily)
- Collection filtering (nature, architecture, minimal, etc.)
- Keyboard shortcuts
- Camera gear information display
- Landscape orientation only

## Installation

### Get Unsplash API Key

1. Go to [Unsplash Developers](https://unsplash.com/oauth/applications)
2. Create a new application (Demo app is fine)
3. Copy your Access Key

### Install Extension

1. Clone this repository:

   ```bash
   git clone https://github.com/aben20807/aperture-tab.git
   ```

2. Open Chrome and navigate to `chrome://extensions/` (or `brave://extensions/` for Brave)
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the extension folder
5. Click the extension icon and enter your Unsplash API key
6. Open a new tab to start using Aperture Tab

## Keyboard Shortcuts

- `Space` - Refresh image
- `Ctrl+Shift+H` - Toggle history panel
- `Ctrl+Shift+F` - Toggle favorite
- `Ctrl+Shift+R` - Refresh image
- `Esc` - Close history panel

## Settings

### Display Options

- Image quality (Regular, Full, Raw)
- Show/hide photographer information

### Auto Refresh

- Manual (default)
- Every 30 minutes
- Every hour
- Daily

### Filters

- Search by keywords
- Filter by collections (nature, architecture, ocean, forest, urban, space, animals)

## Privacy

All data is stored locally on your device:

- API key is stored securely by Chrome
- No external servers except Unsplash API
- No tracking or analytics
- No accounts or sign-ups required
- Open source code for transparency

## Development

Built with:

- Chrome Manifest V3
- Unsplash API
- Vanilla JavaScript
- Chrome Storage API

## Troubleshooting

**Images not loading?**

- Verify API key in settings
- Check internet connection
- Check API rate limits (50 requests/hour for demo apps)

**Extension not working?**

- Verify extension is enabled at `chrome://extensions/`
- Try reloading the extension

## License

Photos provided by Unsplash photographers under the [Unsplash License](https://unsplash.com/license).

## Credits

- [Unsplash](https://unsplash.com) for the amazing photos
- [Unsplash API](https://unsplash.com/developers) for the service
