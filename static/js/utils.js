/**
 * Utility functions for the application
 */

/**
 * Formats a duration in seconds to a human-readable string
 * @param {number|string|object} duration - Duration in seconds, or formatted string, or object with value property
 * @returns {string} Formatted duration string
 */
export function formatDuration(duration) {
    console.log('Formatting duration:', duration, typeof duration);

    if (duration === null || duration === undefined) return '0m';

    // Handle different data types
    let seconds;
    if (typeof duration === 'string') {
        // Try to extract numeric value from string (e.g., "10 min" -> 10)
        const match = duration.match(/[\d.]+/);
        seconds = match ? parseFloat(match[0]) : NaN;

        // If the string contains 'h' or 'hour', assume it's already in hours
        if (!isNaN(seconds) && (duration.includes('h') || duration.toLowerCase().includes('hour'))) {
            seconds = seconds * 3600; // Convert hours to seconds
        }
        // If the string contains 'm' or 'min', assume it's already in minutes
        else if (!isNaN(seconds) && (duration.includes('m') || duration.toLowerCase().includes('min'))) {
            seconds = seconds * 60; // Convert minutes to seconds
        }
    } else if (typeof duration === 'number') {
        seconds = duration;
    } else if (duration && typeof duration === 'object') {
        if (duration.value !== undefined) {
            // Handle Google Maps API format: {value: 3600, text: "1 hour"}
            seconds = parseFloat(duration.value);
        } else if (duration.text !== undefined) {
            // Try to parse from text
            const match = duration.text.match(/[\d.]+/);
            seconds = match ? parseFloat(match[0]) : NaN;

            // Check for hours/minutes in the text
            if (!isNaN(seconds)) {
                if (duration.text.includes('hour') || duration.text.includes('hr')) {
                    seconds *= 3600; // Convert hours to seconds
                } else if (duration.text.includes('min')) {
                    seconds *= 60; // Convert minutes to seconds
                }
            }
        }
    } else {
        seconds = NaN;
    }

    if (isNaN(seconds)) {
        console.warn('Could not parse duration:', duration);
        return '0m';
    }

    console.log('Parsed seconds:', seconds);

    // Convert to minutes if the value is in seconds
    let minutes = Math.round(seconds / 60);

    // Ensure we show at least 1 minute for very short durations
    if (minutes === 0 && seconds > 0) {
        minutes = 1;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
        return `${hours}h ${remainingMinutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Formats a distance in meters to a human-readable string
 * @param {number|string|object} distance - Distance in meters, or formatted string, or object with value property
 * @returns {string} Formatted distance string
 */
export function formatDistance(distance) {
    console.log('Formatting distance:', distance, typeof distance);

    if (distance === null || distance === undefined) return '0 km';

    // Handle different data types
    let meters;
    if (typeof distance === 'string') {
        // Try to extract numeric value from string (e.g., "10 km" -> 10)
        const match = distance.match(/[\d.]+/);
        meters = match ? parseFloat(match[0]) : NaN;

        // If the string contains 'km', assume it's already in kilometers
        if (!isNaN(meters) && distance.includes('km')) {
            meters = meters * 1000; // Convert km to meters
        }
    } else if (typeof distance === 'number') {
        meters = distance;
    } else if (distance && typeof distance === 'object') {
        if (distance.value !== undefined) {
            // Handle Google Maps API format: {value: 1000, text: "1 km"}
            meters = parseFloat(distance.value);
        } else if (distance.text !== undefined) {
            // Try to parse from text
            const match = distance.text.match(/[\d.]+/);
            meters = match ? parseFloat(match[0]) : NaN;

            // Check for km/m in the text
            if (!isNaN(meters)) {
                if (distance.text.includes('km')) {
                    meters *= 1000; // Convert km to meters
                }
            }
        }
    } else {
        meters = NaN;
    }

    if (isNaN(meters)) {
        console.warn('Could not parse distance:', distance);
        return '0 km';
    }

    console.log('Parsed meters:', meters);

    // If the value is already in kilometers (less than 100), multiply by 1000
    if (meters < 100 && !isNaN(meters)) {
        console.log('Value appears to be in km, converting to meters');
        meters *= 1000;
    }

    // Convert to kilometers with 1 decimal place
    const kilometers = (meters / 1000).toFixed(1);

    return `${kilometers} km`;
}

/**
 * Formats a date to a human-readable string
 * @param {Date|string} date - Date object or string
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return dateObj.toLocaleString();
}

/**
 * Generates a unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
    return '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * Debounces a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Creates an element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes to set on the element
 * @param {Array} children - Child elements or text
 * @returns {HTMLElement} Created element
 */
export function createElement(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);

    // Set attributes
    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'style' && typeof value === 'object') {
            Object.entries(value).forEach(([styleKey, styleValue]) => {
                element.style[styleKey] = styleValue;
            });
        } else if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else if (key.startsWith('on') && typeof value === 'function') {
            element.addEventListener(key.substring(2).toLowerCase(), value);
        } else {
            element.setAttribute(key, value);
        }
    });

    // Add children
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    });

    return element;
}

/**
 * Validates if a string is a valid address
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid
 */
export function isValidAddress(address) {
    return address && address.trim().length > 0;
}

/**
 * Converts a string to a URL-friendly slug
 * @param {string} text - Text to convert
 * @returns {string} URL-friendly slug
 */
export function slugify(text) {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}

/**
 * Formats time with "morning" and "afternoon" instead of AM/PM
 * @param {Date} date - Date object to format
 * @param {Date} [referenceDate=null] - Reference date to compare against (to show date if different)
 * @param {boolean} [alwaysShowDate=false] - Whether to always show the date
 * @returns {string} Formatted time string
 */
export function formatTimeWithPeriod(date, referenceDate = null, alwaysShowDate = false) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }

    // Get hours and minutes
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // Determine period (morning or afternoon)
    const period = hours < 12 ? 'morning' : 'afternoon';

    // Convert to 12-hour format
    const displayHours = hours % 12 || 12;

    // Basic time format
    let formattedTime = `${displayHours}:${minutes} ${period}`;

    // Check if we need to show the date
    const showDate = alwaysShowDate ||
                    (referenceDate &&
                     (date.getDate() !== referenceDate.getDate() ||
                      date.getMonth() !== referenceDate.getMonth() ||
                      date.getFullYear() !== referenceDate.getFullYear()));

    if (showDate) {
        // Get day, month names
        const day = date.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];

        // Add date information
        if (referenceDate) {
            // Calculate days difference
            const msPerDay = 24 * 60 * 60 * 1000;
            const daysDiff = Math.round((date - referenceDate) / msPerDay);

            if (daysDiff === 1) {
                formattedTime += ' (next day)';
            } else if (daysDiff > 1) {
                formattedTime += ` (${daysDiff} days later)`;
            } else {
                formattedTime += ` (${day} ${month})`;
            }
        } else {
            formattedTime += ` (${day} ${month})`;
        }
    }

    return formattedTime;
}
