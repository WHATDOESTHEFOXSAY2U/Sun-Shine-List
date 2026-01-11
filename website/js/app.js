/**
 * Main Application Entry Point
 * Initializes all components and handles navigation
 */

// Current active tab
let currentTab = 'distribution';

// Component initialization status
const initialized = {
    distribution: false,
    'top-earners': false,
    employers: false,
    jobs: false,
    'find-employer': false,
    sectors: false,
    trends: false
};

/**
 * Navigate to a tab
 */
function navigateTo(tabName) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.toggle('active', tab.id === `tab-${tabName}`);
    });

    currentTab = tabName;

    // Initialize component if not already done
    initializeTab(tabName);
}

/**
 * Initialize a tab's component
 */
async function initializeTab(tabName) {
    if (initialized[tabName]) return;

    try {
        switch (tabName) {
            case 'distribution':
                await Distribution.init();
                break;
            case 'top-earners':
                await TopEarners.init();
                break;
            case 'employers':
                await TopEmployers.init();
                break;
            case 'jobs':
                await TopJobs.init();
                break;
            case 'find-employer':
                await FindEmployer.init();
                break;
            case 'sectors':
                await Sectors.init();
                break;
            case 'trends':
                await Trends.init();
                break;
        }

        initialized[tabName] = true;
    } catch (error) {
        console.error(`Error initializing ${tabName}:`, error);
    }
}

/**
 * Setup navigation event listeners
 */
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            navigateTo(btn.dataset.tab);
        });
    });
}

/**
 * Handle keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Escape closes modals
        if (e.key === 'Escape') {
            closeModal('employer-modal');
            closeModal('individual-modal');
        }

        // Cmd/Ctrl + K opens search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('global-search')?.focus();
        }
    });
}

/**
 * Initialize the application
 */
async function initApp() {
    console.log('🌞 Initializing Sunshine List Explorer...');

    try {
        // Setup navigation
        setupNavigation();

        // Setup keyboard shortcuts
        setupKeyboardShortcuts();

        // Initialize search
        await Search.init();

        // Initialize the default tab (Distribution)
        await initializeTab('distribution');

        console.log('✅ Application initialized successfully');

    } catch (error) {
        console.error('❌ Error initializing application:', error);

        // Show error message
        const main = document.querySelector('.main-content');
        if (main) {
            main.innerHTML = `
                <div class="empty-state" style="padding: 4rem;">
                    <div class="empty-state-icon">⚠️</div>
                    <h2>Error Loading Data</h2>
                    <p style="margin-top: 1rem; color: var(--warm-500);">
                        Unable to load data files. Make sure the server is running and data files exist in API/analytics/
                    </p>
                    <p style="margin-top: 0.5rem; color: var(--warm-400); font-size: var(--text-sm);">
                        Error: ${error.message}
                    </p>
                    <button class="btn btn-primary" style="margin-top: 1.5rem;" onclick="location.reload()">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Make navigateTo globally available
window.navigateTo = navigateTo;
