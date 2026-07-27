/**
 * Cross-browser clipboard utility
 * Works on HTTPS, HTTP, and localhost
 */

/**
 * Copy text to clipboard with fallback support
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export const copyToClipboard = async (text) => {
  try {
    // Method 1: Modern Clipboard API (works on HTTPS and localhost)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Method 2: Fallback using execCommand (works on HTTP)
    return fallbackCopyToClipboard(text);
  } catch (err) {
    console.error('Clipboard API failed, trying fallback:', err);
    // Try fallback if modern API fails
    return fallbackCopyToClipboard(text);
  }
};

/**
 * Fallback copy method using execCommand
 * Works on HTTP and older browsers
 * @param {string} text - Text to copy
 * @returns {boolean} - Success status
 */
const fallbackCopyToClipboard = (text) => {
  try {
    // Create temporary textarea
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make it invisible and non-interactive
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    
    // Select text based on device
    const isIOS = /ipad|iphone/i.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);
    
    if (isIOS) {
      // iOS specific selection
      const range = document.createRange();
      range.selectNodeContents(textArea);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      textArea.setSelectionRange(0, 999999);
    } else if (isAndroid) {
      // Android specific
      textArea.focus();
      textArea.setSelectionRange(0, text.length);
    } else {
      // Desktop
      textArea.focus();
      textArea.select();
    }
    
    // Execute copy command
    const successful = document.execCommand('copy');
    
    // Clean up
    document.body.removeChild(textArea);
    
    return successful;
  } catch (err) {
    console.error('Fallback copy failed:', err);
    return false;
  }
};

/**
 * Check if clipboard API is available
 * @returns {boolean}
 */
export const isClipboardAvailable = () => {
  return !!(navigator.clipboard && navigator.clipboard.writeText);
};

/**
 * Get clipboard support info
 * @returns {object} - Support information
 */
export const getClipboardSupport = () => {
  return {
    modern: isClipboardAvailable(),
    fallback: !!document.queryCommandSupported && document.queryCommandSupported('copy'),
    protocol: window.location.protocol,
    isSecure: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
  };
};
