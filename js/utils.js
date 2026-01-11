/**
 * Utility Functions
 * Formatting, calculations, and helper functions
 */

const Utils = {
    /**
     * Format number as currency
     */
    formatCurrency(value, compact = false) {
        if (value == null || isNaN(value)) return '--';

        if (compact) {
            if (Math.abs(value) >= 1000000000) {
                return '$' + (value / 1000000000).toFixed(1) + 'B';
            }
            if (Math.abs(value) >= 1000000) {
                return '$' + (value / 1000000).toFixed(1) + 'M';
            }
            if (Math.abs(value) >= 1000) {
                return '$' + (value / 1000).toFixed(0) + 'K';
            }
        }

        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    },

    /**
     * Format number with commas
     */
    formatNumber(value, compact = false) {
        if (value == null || isNaN(value)) return '--';

        if (compact) {
            if (Math.abs(value) >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
            }
            if (Math.abs(value) >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
            }
        }

        return new Intl.NumberFormat('en-CA').format(value);
    },

    /**
     * Format percentage
     */
    formatPercent(value, decimals = 1) {
        if (value == null || isNaN(value)) return '--';
        const sign = value > 0 ? '+' : '';
        return sign + (value * 100).toFixed(decimals) + '%';
    },

    /**
     * Format percentage change with styling class
     */
    formatDelta(value, invert = false) {
        if (value == null || isNaN(value)) return { text: '', class: '' };

        const isPositive = invert ? value < 0 : value > 0;
        return {
            text: this.formatPercent(value),
            class: isPositive ? 'positive' : (value < 0 ? 'negative' : '')
        };
    },

    /**
     * Normalize value to 0-100 scale
     */
    normalize(value, min, max) {
        if (max === min) return 50;
        return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    },

    /**
     * Truncate text with ellipsis
     */
    truncate(text, maxLength = 40) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    },

    /**
     * Title case a string
     */
    titleCase(str) {
        if (!str) return '';
        return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    },

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Generate salary buckets
     */
    getSalaryBuckets() {
        return [
            { min: 100000, max: 125000, label: '$100K-$125K' },
            { min: 125000, max: 150000, label: '$125K-$150K' },
            { min: 150000, max: 200000, label: '$150K-$200K' },
            { min: 200000, max: 300000, label: '$200K-$300K' },
            { min: 300000, max: 500000, label: '$300K-$500K' },
            { min: 500000, max: Infinity, label: '$500K+' }
        ];
    },

    /**
     * Get years array from summary data
     */
    getYears(data) {
        if (!data) return [];
        return Object.keys(data).map(Number).sort((a, b) => b - a);
    },

    /**
     * Populate year dropdown
     */
    populateYearDropdown(selectId, years, defaultYear = null) {
        const select = document.getElementById(selectId);
        if (!select || !years.length) return;

        select.innerHTML = years.map(year =>
            `<option value="${year}" ${year === defaultYear ? 'selected' : ''}>${year}</option>`
        ).join('');
    },

    /**
     * Get color from theme
     */
    getColor(name) {
        const colors = {
            sunshine: '#F59E0B',
            orange: '#F97316',
            success: '#22C55E',
            error: '#EF4444',
            info: '#3B82F6',
            warm: '#78716C'
        };
        return colors[name] || colors.sunshine;
    },

    /**
     * Chart colors palette
     */
    chartColors: [
        '#F59E0B', // sunshine
        '#F97316', // orange
        '#3B82F6', // blue
        '#22C55E', // green
        '#8B5CF6', // purple
        '#EC4899', // pink
        '#06B6D4', // cyan
        '#84CC16', // lime
    ],

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Make globally available
window.Utils = Utils;
