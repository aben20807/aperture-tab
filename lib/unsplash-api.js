/**
 * Unsplash API Wrapper
 * Handles all API calls to Unsplash
 */

class UnsplashAPI {
  constructor(accessKey) {
    this.accessKey = accessKey;
    this.baseUrl = 'https://api.unsplash.com';
  }

  /**
   * Get a random photo
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Photo data
   */
  async getRandomPhoto(options = {}) {
    const params = new URLSearchParams({
      client_id: this.accessKey,
      orientation: 'landscape', // Force landscape/horizontal photos only
      content_filter: 'high', // Exclude 3D renders, only real camera photos
      ...options
    });

    if (options.collections && options.collections.length > 0) {
      params.set('collections', options.collections.join(','));
    }

    if (options.query) {
      params.set('query', options.query);
    }

    try {
      const response = await fetch(`${this.baseUrl}/photos/random?${params}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching random photo:', error);
      throw error;
    }
  }

  /**
   * Search for photos
   * @param {string} query - Search term
   * @param {number} page - Page number
   * @param {number} perPage - Results per page
   * @returns {Promise<Object>} Search results
   */
  async searchPhotos(query, page = 1, perPage = 30) {
    const params = new URLSearchParams({
      client_id: this.accessKey,
      query,
      page,
      per_page: perPage,
      content_filter: 'high' // Exclude 3D renders, only real camera photos
    });

    try {
      const response = await fetch(`${this.baseUrl}/search/photos?${params}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching photos:', error);
      throw error;
    }
  }

  /**
   * Get photos from a collection
   * @param {string} collectionId - Collection ID
   * @param {number} page - Page number
   * @param {number} perPage - Results per page
   * @returns {Promise<Array>} Collection photos
   */
  async getCollectionPhotos(collectionId, page = 1, perPage = 30) {
    const params = new URLSearchParams({
      client_id: this.accessKey,
      page,
      per_page: perPage
    });

    try {
      const response = await fetch(`${this.baseUrl}/collections/${collectionId}/photos?${params}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching collection photos:', error);
      throw error;
    }
  }

  /**
   * Track photo download (required by Unsplash API guidelines)
   * @param {string} downloadLocation - Download endpoint from photo data
   */
  async trackDownload(downloadLocation) {
    if (!downloadLocation) return;
    
    try {
      await fetch(`${downloadLocation}?client_id=${this.accessKey}`);
    } catch (error) {
      console.error('Error tracking download:', error);
    }
  }

  /**
   * Format photo data for storage
   * @param {Object} photo - Raw photo data from API
   * @returns {Object} Formatted photo data
   */
  formatPhotoData(photo) {
    return {
      id: photo.id,
      timestamp: Date.now(),
      urls: {
        raw: photo.urls.raw,
        full: photo.urls.full,
        regular: photo.urls.regular,
        small: photo.urls.small,
        thumb: photo.urls.thumb
      },
      user: {
        name: photo.user.name,
        username: photo.user.username,
        portfolio: photo.user.portfolio_url,
        profile: photo.user.links.html
      },
      links: {
        html: photo.links.html,
        download: photo.links.download_location
      },
      description: photo.description || photo.alt_description || '',
      location: photo.location ? {
        city: photo.location.city,
        country: photo.location.country,
        name: photo.location.name
      } : null,
      exif: photo.exif || null,
      color: photo.color || '#000000',
      likes: photo.likes || 0,
      width: photo.width,
      height: photo.height
    };
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UnsplashAPI;
}
