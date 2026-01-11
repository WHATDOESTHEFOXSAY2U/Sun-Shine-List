/**
 * Search Functionality
 * Global search with autocomplete using Fuse.js
 */

const Search = {
    fuse: null,
    searchData: [],

    /**
     * Initialize search with data
     */
    async init() {
        try {
            const searchIndex = await DataService.getSearchIndex();
            const topEarners = await DataService.getTopEarners();

            // Prepare search data
            this.searchData = [];
            const processedIds = new Set(); // Track unique individuals

            // Add employers
            if (searchIndex.employers) {
                searchIndex.employers.forEach(emp => {
                    this.searchData.push({
                        type: 'employer',
                        id: emp.id,
                        name: emp.name,
                        displayName: emp.name,
                        detail: 'Employer'
                    });
                });
            }

            // Add jobs
            if (searchIndex.jobs) {
                searchIndex.jobs.forEach(job => {
                    this.searchData.push({
                        type: 'job',
                        id: job.id,
                        name: job.title,
                        displayName: job.title,
                        detail: job.family || 'Job Title'
                    });
                });
            }

            // Add individuals from top earners
            if (topEarners) {
                Object.values(topEarners).forEach(yearList => {
                    if (!Array.isArray(yearList)) return;

                    yearList.forEach(person => {
                        // Use unique ID if available, otherwise name + employer
                        // Note: person_id is best, but we want to show the LATEST job title in search?
                        // For simplicity, we just add them. Fuse.js handles duplicates in results nicely usually,
                        // but we want to avoid blowing up the index size.
                        // Let's rely on person_id for uniqueness.

                        const personId = person.person_id || `${person.first_name}|${person.last_name}`;

                        // We only want to add each person ONCE (preferably their most recent record)
                        // But since we iterate years, we might see them multiple times. 
                        // It's better to process years Reverse Order (newest first) and ignore if seen.
                        // But Object.values order isn't guaranteed. 

                        // Let's use the processedIds Set.
                        if (!processedIds.has(personId)) {
                            processedIds.add(personId);

                            this.searchData.push({
                                type: 'individual',
                                id: personId,
                                name: `${person.first_name} ${person.last_name}`,
                                displayName: `${person.first_name} ${person.last_name}`,
                                detail: person.employer_canonical || person.employer || 'Public Sector',
                                // Store extra data for the profile call
                                employer: person.employer_canonical || person.employer
                            });
                        }
                    });
                });
            }

            // Initialize Fuse.js
            this.fuse = new Fuse(this.searchData, {
                keys: ['name', 'detail'], // Search by name (and employer/job detail)
                threshold: 0.3,
                distance: 100,
                minMatchCharLength: 2
            });

            // Setup event listeners
            this.setupEventListeners();

        } catch (error) {
            console.error('Error initializing search:', error);
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const searchInput = document.getElementById('global-search');
        const searchResults = document.getElementById('search-results');

        if (!searchInput || !searchResults) return;

        // Input handler with debounce
        searchInput.addEventListener('input', Utils.debounce((e) => {
            const query = e.target.value.trim();

            if (query.length < 2) {
                this.hideResults();
                return;
            }

            this.search(query);
        }, 200));

        // Focus handler
        searchInput.addEventListener('focus', () => {
            const query = searchInput.value.trim();
            if (query.length >= 2) {
                this.search(query);
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                this.hideResults();
            }
        });

        // Keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideResults();
                searchInput.blur();
            }
        });
    },

    /**
     * Perform search
     */
    search(query) {
        if (!this.fuse) return;

        const results = this.fuse.search(query, { limit: 10 });
        this.showResults(results.map(r => r.item));
    },

    /**
     * Show search results
     */
    showResults(results) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="search-result-item">
                    <div class="search-result-name">No results found</div>
                </div>
            `;
        } else {
            searchResults.innerHTML = results.map(item => `
                <div class="search-result-item" onclick="Search.selectResult('${item.type}', '${Utils.escapeHtml(item.id)}', '${Utils.escapeHtml(item.name.replace(/'/g, "\\'"))}', '${Utils.escapeHtml((item.employer || '').replace(/'/g, "\\'"))}')">
                    <div class="search-result-type">${item.type}</div>
                    <div class="search-result-name">${Utils.escapeHtml(item.displayName)}</div>
                    <div class="search-result-detail">${Utils.escapeHtml(item.detail)}</div>
                </div>
            `).join('');
        }

        searchResults.classList.add('active');
    },

    /**
     * Hide search results
     */
    hideResults() {
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.classList.remove('active');
        }
    },

    /**
     * Handle result selection
     */
    selectResult(type, id, name, employer) {
        this.hideResults();
        document.getElementById('global-search').value = '';

        if (type === 'employer') {
            Profiles.showEmployerProfile(id);
        } else if (type === 'individual') {
            // Determine employer if redundant or implicit
            const empName = employer && employer !== 'undefined' ? employer : '';
            Profiles.showIndividualProfile(name, empName);
        } else if (type === 'job') {
            // For now, switch to jobs tab and maybe filter?
            // Accessing global App or similar would be ideal, but for now:
            const jobsBtn = document.querySelector('button[data-tab="jobs"]');
            if (jobsBtn) jobsBtn.click();
        }
    }
};

// Make globally available
window.Search = Search;
