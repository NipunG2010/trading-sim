/**
 * Utility functions for trading patterns
 */

/**
 * Sleep for a specified number of milliseconds
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get a random number between min and max
 * @param min Minimum value
 * @param max Maximum value
 * @returns Random number between min and max
 */
export const getRandomNumber = (min: number, max: number) => Math.random() * (max - min) + min;

/**
 * Get a random integer between min and max (inclusive)
 * @param min Minimum value
 * @param max Maximum value
 * @returns Random integer between min and max
 */
export const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;