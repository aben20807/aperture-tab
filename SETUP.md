# 🚀 Quick Setup Guide - Aperture Tab

Follow these steps to get your Aperture Tab extension running:

## Step 1: Get Unsplash API Key (2 minutes)

1. Visit [Unsplash Developers](https://unsplash.com/oauth/applications)
2. Click "New Application"
3. Accept the API terms
4. Fill in the application details:
   - **Application name**: "My New Tab Extension" (or any name)
   - **Description**: "Personal new tab extension"
5. Click "Create Application"
6. Copy your **Access Key** (starts with something like "abc123...")

## Step 2: Create Extension Icons (Optional)

The extension works without icons, but for a better experience:

### Quick Method - Use Placeholder
The extension will load with default Chrome icons - this is fine for personal use!

### Better Method - Create Icons
1. Go to [Favicon.io Emoji Generator](https://favicon.io/emoji-favicons/)
2. Select a 📷 camera or 🏔️ mountain emoji
3. Download the generated favicons
4. Rename and copy these files to the `icons/` folder:
   - `favicon-16x16.png` → `icon16.png`
   - `android-chrome-192x192.png` → resize to 48x48 → `icon48.png`
   - `android-chrome-512x512.png` → resize to 128x128 → `icon128.png`

**Or** just continue without icons - the extension works perfectly either way!

## Step 3: Load Extension in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select this folder: `unsplash_tab`
5. The extension should now appear in your extensions list ✅

## Step 4: Configure Settings

1. Click the extension icon in your Chrome toolbar (puzzle piece icon → Aperture Tab)
   - Or click the gear icon ⚙️ on any new tab page
2. Paste your **Unsplash API Key** in the "API Configuration" field
3. (Optional) Customize other settings:
   - Image quality
   - Auto-refresh interval
   - Collections or search terms
4. Click **"Save Settings"** 💾

### 🔒 Privacy & Security Note

Your API key is **stored locally on your computer only**:
- ✅ Saved in Chrome's encrypted local storage (chrome.storage.local)
- ✅ Never transmitted to any server except Unsplash API
- ✅ Not shared, not synced, not sent anywhere
- ✅ Stays on your device even if you close Chrome
- ✅ You can export/backup your data anytime (API key excluded for security)

The extension is **100% local** - no accounts, no cloud, no external servers!

## Step 5: Test It Out! 🎉

1. Open a **new tab** (Ctrl+T or Cmd+T)
2. You should see a beautiful Unsplash image!
3. Try the controls:
   - Press **Space** to refresh
   - Click the **heart** to favorite
   - Click the **clock** to view history
   - Click **download** to save the image

## Keyboard Shortcuts

- `Space` - Refresh image
- `Ctrl+Shift+H` - Toggle history panel
- `Ctrl+Shift+F` - Add to favorites
- `Ctrl+Shift+R` - Refresh image (alternative)
- `Esc` - Close panels

## Troubleshooting

### No images showing?
- ✅ Check your API key is correct
- ✅ Verify internet connection
- ✅ Open DevTools (F12) and check console for errors

### "Failed to load image" error?
- You might be hitting API rate limits (50 requests/hour for demo apps)
- Wait a few minutes and try again
- Consider upgrading to Unsplash API Production for higher limits

### Extension not appearing?
- Make sure Developer mode is ON
- Try clicking the "Reload" button on the extension card
- Check for any errors in the Extensions page

## Rate Limits

Free Unsplash API (Demo):
- **50 requests per hour**
- Perfect for personal use
- If you hit the limit, images will load again after an hour

To increase limits:
1. Apply for Production access on Unsplash
2. Follow their approval process
3. Update your API key in settings

## Next Steps

- ⭐ Explore different collections in settings
- 📸 Build up your favorites collection
- 🔄 Try different auto-refresh intervals
- 🎨 Customize with search terms

Enjoy your beautiful new tab experience! 🌄
