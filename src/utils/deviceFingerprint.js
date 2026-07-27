// Simple Device ID without fingerprinting

/**
 * Get or create simple device ID
 */
export const getDeviceId = () => {
  const STORAGE_KEY = 'x_studio_device_id';
  
  // Try to get existing ID
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    // Generate simple random ID
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  
  return deviceId;
};

/**
 * Verify device (always true for simplicity)
 */
export const verifyDevice = () => {
  return true;
};
