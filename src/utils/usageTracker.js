// Usage tracking with device fingerprinting

import { getDeviceId } from './deviceFingerprint';

const STORAGE_KEY = 'x_studio_usage';
const DEVICE_USAGE_KEY = 'x_studio_device_usage';

/**
 * Get today's date string
 */
const getTodayKey = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Get usage data from localStorage
 */
export const getUsageData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error reading usage data:', error);
    return {};
  }
};

/**
 * Save usage data to localStorage
 */
const saveUsageData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving usage data:', error);
  }
};

/**
 * Get usage for a specific model today
 */
export const getModelUsage = (modelId) => {
  const today = getTodayKey();
  const data = getUsageData();
  
  if (!data[today]) {
    return 0;
  }
  
  return data[today][modelId] || 0;
};

/**
 * Increment usage for a model
 */
export const incrementUsage = (modelId) => {
  const today = getTodayKey();
  const data = getUsageData();
  
  if (!data[today]) {
    data[today] = {};
  }
  
  data[today][modelId] = (data[today][modelId] || 0) + 1;
  
  // Clean up old data (keep only last 7 days)
  const dates = Object.keys(data);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];
  
  dates.forEach(date => {
    if (date < cutoffDate) {
      delete data[date];
    }
  });
  
  saveUsageData(data);
  return data[today][modelId];
};

/**
 * Check if model has reached daily limit
 */
export const hasReachedLimit = (modelId, limit) => {
  if (limit === Infinity) {
    return false;
  }
  
  const usage = getModelUsage(modelId);
  return usage >= limit;
};

/**
 * Get remaining uses for a model
 */
export const getRemainingUses = (modelId, limit) => {
  if (limit === Infinity) {
    return Infinity;
  }
  
  const usage = getModelUsage(modelId);
  return Math.max(0, limit - usage);
};

/**
 * Reset usage for a model (admin function)
 */
export const resetModelUsage = (modelId) => {
  const today = getTodayKey();
  const data = getUsageData();
  
  if (data[today] && data[today][modelId]) {
    delete data[today][modelId];
    saveUsageData(data);
  }
};

/**
 * Get all usage stats for today
 */
export const getTodayStats = () => {
  const today = getTodayKey();
  const data = getUsageData();
  return data[today] || {};
};

/**
 * Clear all usage data
 */
export const clearAllUsage = () => {
  localStorage.removeItem(STORAGE_KEY);
};

/**
 * Get device-specific usage data
 */
export const getDeviceUsageData = () => {
  try {
    const deviceId = getDeviceId();
    const data = localStorage.getItem(DEVICE_USAGE_KEY);
    const allData = data ? JSON.parse(data) : {};
    return allData[deviceId] || { totalUsage: 0, dailyUsage: {}, firstUse: null, resetDate: null };
  } catch (error) {
    console.error('Error reading device usage:', error);
    return { totalUsage: 0, dailyUsage: {}, firstUse: null, resetDate: null };
  }
};

/**
 * Save device-specific usage data
 */
const saveDeviceUsageData = (deviceData) => {
  try {
    const deviceId = getDeviceId();
    const data = localStorage.getItem(DEVICE_USAGE_KEY);
    const allData = data ? JSON.parse(data) : {};
    allData[deviceId] = deviceData;
    localStorage.setItem(DEVICE_USAGE_KEY, JSON.stringify(allData));
  } catch (error) {
    console.error('Error saving device usage:', error);
  }
};



/**
 * Increment device usage with daily tracking
 */
export const incrementDeviceUsage = (modelId) => {
  const deviceData = getDeviceUsageData();
  const now = new Date().toISOString();
  const today = getTodayKey();
  
  if (!deviceData.firstUse) {
    deviceData.firstUse = now;
    deviceData.resetDate = getResetDate(now);
  }
  
  // Increment total usage
  deviceData.totalUsage = (deviceData.totalUsage || 0) + 1;
  
  // Track daily usage per model
  if (!deviceData.dailyUsage) {
    deviceData.dailyUsage = {};
  }
  if (!deviceData.dailyUsage[today]) {
    deviceData.dailyUsage[today] = {};
  }
  deviceData.dailyUsage[today][modelId] = (deviceData.dailyUsage[today][modelId] || 0) + 1;
  
  // Clean old daily data (keep last 35 days)
  const dates = Object.keys(deviceData.dailyUsage);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 35);
  const cutoffKey = cutoffDate.toISOString().split('T')[0];
  
  dates.forEach(date => {
    if (date < cutoffKey) {
      delete deviceData.dailyUsage[date];
    }
  });
  
  saveDeviceUsageData(deviceData);
  
  return deviceData.totalUsage;
};

/**
 * Check if device has reached total limit
 */
export const hasReachedDeviceLimit = (limit) => {
  const deviceData = getDeviceUsageData();
  
  // Check if reset date has passed
  if (deviceData.resetDate) {
    const resetDate = new Date(deviceData.resetDate);
    const now = new Date();
    
    if (now >= resetDate) {
      // Reset usage
      saveDeviceUsageData({
        totalUsage: 0,
        dailyUsage: {},
        firstUse: now.toISOString(),
        resetDate: getResetDate(now.toISOString())
      });
      return false;
    }
  }
  
  return deviceData.totalUsage >= limit;
};

/**
 * Check if model has reached its specific limit
 */
export const hasReachedModelLimit = (modelId, dailyLimit, totalLimit) => {
  const deviceData = getDeviceUsageData();
  const today = getTodayKey();
  
  // Check total limit first
  if (totalLimit !== Infinity) {
    const modelTotalUsage = getModelTotalUsage(deviceData, modelId);
    if (modelTotalUsage >= totalLimit) {
      return true;
    }
  }
  
  // Check daily limit
  if (dailyLimit !== Infinity) {
    const dailyUsage = deviceData.dailyUsage?.[today]?.[modelId] || 0;
    if (dailyUsage >= dailyLimit) {
      return true;
    }
  }
  
  return false;
};

/**
 * Get total usage for a specific model
 */
const getModelTotalUsage = (deviceData, modelId) => {
  if (!deviceData.dailyUsage) return 0;
  
  let total = 0;
  Object.values(deviceData.dailyUsage).forEach(day => {
    total += day[modelId] || 0;
  });
  
  return total;
};

/**
 * Get model usage stats
 */
export const getModelUsageStats = (modelId, dailyLimit, totalLimit) => {
  const deviceData = getDeviceUsageData();
  const today = getTodayKey();
  
  const dailyUsage = deviceData.dailyUsage?.[today]?.[modelId] || 0;
  const totalUsage = getModelTotalUsage(deviceData, modelId);
  
  return {
    dailyUsage,
    dailyRemaining: dailyLimit === Infinity ? Infinity : Math.max(0, dailyLimit - dailyUsage),
    totalUsage,
    totalRemaining: totalLimit === Infinity ? Infinity : Math.max(0, totalLimit - totalUsage),
    isLimitReached: hasReachedModelLimit(modelId, dailyLimit, totalLimit)
  };
};

/**
 * Get reset date (30 days from first use)
 */
const getResetDate = (firstUseDate) => {
  const date = new Date(firstUseDate);
  date.setDate(date.getDate() + 30);
  return date.toISOString();
};

/**
 * Get days until reset
 */
export const getDaysUntilReset = () => {
  const deviceData = getDeviceUsageData();
  
  if (!deviceData.resetDate) return null;
  
  const resetDate = new Date(deviceData.resetDate);
  const now = new Date();
  const diffTime = resetDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
};

/**
 * Get total device usage
 */
export const getTotalDeviceUsage = () => {
  const deviceData = getDeviceUsageData();
  return deviceData.totalUsage || 0;
};
