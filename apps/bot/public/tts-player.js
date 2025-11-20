/**
 * TTS Play Button Component
 * Adds interactive play buttons to images and slides for text-to-speech
 */

class TTSPlayer {
  constructor(options = {}) {
    this.apiEndpoint = options.apiEndpoint || '/api/tts';
    this.voice = options.voice || 'bm_fable';
    this.currentAudio = null;
    this.playingButton = null;
    this.playingElement = null;
    this.readAllQueue = [];
    this.isReadingAll = false;
    this.currentQueueIndex = 0;
  }

  /**
   * Initialize TTS player on the page
   * Finds all elements with data-tts attribute and adds play buttons
   */
  init() {
    // Find all elements with TTS data
    const elements = document.querySelectorAll('[data-tts]');

    elements.forEach(el => {
      const text = el.getAttribute('data-tts');
      if (text && text.trim()) {
        // For text elements (h1, h2, h3, p), add click handler instead of button
        if (el.classList.contains('tts-text')) {
          this.addTextClickHandler(el, text);
        } else {
          // For images, add play button overlay
          this.addPlayButton(el, text);
        }
      }
    });

    // Also add play buttons to images with alt text
    const images = document.querySelectorAll('img[alt]');
    images.forEach(img => {
      const altText = img.getAttribute('alt');
      if (altText && altText.trim() && !img.hasAttribute('data-tts-skip') && !img.hasAttribute('data-tts')) {
        this.addPlayButton(img, altText);
      }
    });

    // Set up "Read All" button if it exists
    const readAllButton = document.getElementById('tts-read-all');
    const stopAllButton = document.getElementById('tts-stop-all');

    if (readAllButton) {
      readAllButton.addEventListener('click', () => this.readAll());
    }

    if (stopAllButton) {
      stopAllButton.addEventListener('click', () => this.stopAll());
    }

    console.log('✅ TTS Player initialized');
  }

  /**
   * Add a play button to an element
   */
  addPlayButton(element, text) {
    // Create container wrapper if element isn't already wrapped
    const wrapper = document.createElement('div');
    wrapper.className = 'tts-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';

    // Wrap the element
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);

    // Create play button
    const button = document.createElement('button');
    button.className = 'tts-play-button';
    button.setAttribute('aria-label', 'Play audio description');
    button.setAttribute('title', 'Play audio description');
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="tts-icon-play">
        <path d="M8 5v14l11-7z"/>
      </svg>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="tts-icon-loading" style="display:none;">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="tts-icon-pause" style="display:none;">
        <path d="M6 6h4v12H6zm8 0h4v12h-4z"/>
      </svg>
    `;

    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handlePlayClick(button, text);
    });

    // Add keyboard support
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handlePlayClick(button, text);
      }
    });

    wrapper.appendChild(button);
  }

  /**
   * Handle play button click
   */
  async handlePlayClick(button, text) {
    // If already playing this button, pause
    if (this.playingButton === button && this.currentAudio && !this.currentAudio.paused) {
      this.pause();
      return;
    }

    // Stop any currently playing audio
    if (this.currentAudio) {
      this.stop();
    }

    // Set loading state
    this.setButtonState(button, 'loading');
    this.playingButton = button;

    try {
      // Request TTS audio
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: this.voice,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      // Get audio blob
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      // Create and play audio
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.addEventListener('ended', () => {
        this.setButtonState(button, 'play');
        this.playingButton = null;
      });

      this.currentAudio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        this.setButtonState(button, 'play');
        this.playingButton = null;
      });

      await this.currentAudio.play();
      this.setButtonState(button, 'pause');

      // Clean up blob URL when audio ends
      this.currentAudio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      });

    } catch (error) {
      console.error('TTS playback error:', error);
      alert(`Error playing audio: ${error.message}`);
      this.setButtonState(button, 'play');
      this.playingButton = null;
    }
  }

  /**
   * Set button visual state
   */
  setButtonState(button, state) {
    const playIcon = button.querySelector('.tts-icon-play');
    const loadingIcon = button.querySelector('.tts-icon-loading');
    const pauseIcon = button.querySelector('.tts-icon-pause');

    // Hide all icons
    playIcon.style.display = 'none';
    loadingIcon.style.display = 'none';
    pauseIcon.style.display = 'none';

    // Show appropriate icon
    if (state === 'play') {
      playIcon.style.display = 'block';
      button.classList.remove('tts-loading', 'tts-playing');
    } else if (state === 'loading') {
      loadingIcon.style.display = 'block';
      button.classList.add('tts-loading');
      button.classList.remove('tts-playing');
    } else if (state === 'pause') {
      pauseIcon.style.display = 'block';
      button.classList.add('tts-playing');
      button.classList.remove('tts-loading');
    }
  }

  /**
   * Pause current audio
   */
  pause() {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      if (this.playingButton) {
        this.setButtonState(this.playingButton, 'play');
      }
    }
  }

  /**
   * Stop current audio
   */
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      if (this.playingButton) {
        this.setButtonState(this.playingButton, 'play');
      }
      if (this.playingElement) {
        this.playingElement.classList.remove('tts-playing');
      }
      this.playingButton = null;
      this.playingElement = null;
    }
  }

  /**
   * Add click handler to text elements
   */
  addTextClickHandler(element, text) {
    element.style.cursor = 'pointer';
    element.setAttribute('title', 'Click to hear this read aloud');
    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');

    element.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.playText(element, text);
    });

    element.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        await this.playText(element, text);
      }
    });
  }

  /**
   * Play text for a text element
   */
  async playText(element, text) {
    // If already playing this element, stop
    if (this.playingElement === element && this.currentAudio && !this.currentAudio.paused) {
      this.stop();
      return;
    }

    // Stop any currently playing audio
    if (this.currentAudio) {
      this.stop();
    }

    // Mark element as playing
    this.playingElement = element;
    element.classList.add('tts-playing');

    try {
      // Request TTS audio
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voice: this.voice,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      // Get audio blob
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);

      // Create and play audio
      this.currentAudio = new Audio(audioUrl);
      this.currentAudio.addEventListener('ended', () => {
        element.classList.remove('tts-playing');
        this.playingElement = null;
        URL.revokeObjectURL(audioUrl);

        // If reading all, continue to next item
        if (this.isReadingAll) {
          this.playNextInQueue();
        }
      });

      this.currentAudio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        element.classList.remove('tts-playing');
        this.playingElement = null;
      });

      await this.currentAudio.play();

    } catch (error) {
      console.error('TTS playback error:', error);
      element.classList.remove('tts-playing');
      this.playingElement = null;
      if (!this.isReadingAll) {
        alert(`Error playing audio: ${error.message}`);
      }
    }
  }

  /**
   * Read all text elements in sequence
   */
  readAll() {
    // Build queue of all TTS elements
    const allElements = Array.from(document.querySelectorAll('[data-tts]'));
    this.readAllQueue = allElements.filter(el => {
      const text = el.getAttribute('data-tts');
      return text && text.trim();
    });

    if (this.readAllQueue.length === 0) {
      alert('No content available to read');
      return;
    }

    this.isReadingAll = true;
    this.currentQueueIndex = 0;

    // Show stop button, hide read all button
    const readAllButton = document.getElementById('tts-read-all');
    const stopAllButton = document.getElementById('tts-stop-all');
    if (readAllButton) readAllButton.style.display = 'none';
    if (stopAllButton) stopAllButton.style.display = 'inline-flex';

    // Start reading
    this.playNextInQueue();
  }

  /**
   * Play next item in the read-all queue
   */
  async playNextInQueue() {
    if (!this.isReadingAll || this.currentQueueIndex >= this.readAllQueue.length) {
      this.stopAll();
      return;
    }

    const element = this.readAllQueue[this.currentQueueIndex];
    const text = element.getAttribute('data-tts');

    this.currentQueueIndex++;

    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Play the element
    if (element.classList.contains('tts-text')) {
      await this.playText(element, text);
    } else {
      // For images with buttons, find and trigger the button
      const wrapper = element.closest('.tts-wrapper');
      if (wrapper) {
        const button = wrapper.querySelector('.tts-play-button');
        if (button) {
          this.handlePlayClick(button, text);
        }
      }
    }
  }

  /**
   * Stop reading all
   */
  stopAll() {
    this.isReadingAll = false;
    this.readAllQueue = [];
    this.currentQueueIndex = 0;

    // Stop current audio
    this.stop();

    // Show read all button, hide stop button
    const readAllButton = document.getElementById('tts-read-all');
    const stopAllButton = document.getElementById('tts-stop-all');
    if (readAllButton) readAllButton.style.display = 'inline-flex';
    if (stopAllButton) stopAllButton.style.display = 'none';
  }
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.ttsPlayerConfig?.autoInit !== false) {
      window.ttsPlayer = new TTSPlayer(window.ttsPlayerConfig || {});
      window.ttsPlayer.init();
    }
  });
} else {
  if (window.ttsPlayerConfig?.autoInit !== false) {
    window.ttsPlayer = new TTSPlayer(window.ttsPlayerConfig || {});
    window.ttsPlayer.init();
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TTSPlayer;
}
