/**
 * Top Earners Page Component
 * Shows highest paid individuals with sorting and filtering
 */

const TopEarners = {
    data: null,
    currentYear: null,
    sortBy: 'total_comp',
    limit: 100,
    searchQuery: '',

    /**
     * Initialize top earners page
     */
    async init() {
        try {
            this.data = await DataService.getTopEarners();
            const years = Object.keys(this.data).map(Number).sort((a, b) => b - a);
            this.currentYear = years[0];

            // Populate year dropdown
            Utils.populateYearDropdown('earners-year', years, this.currentYear);

            // Setup event listeners
            this.setupEventListeners();

            // Initial render
            this.render();

        } catch (error) {
            console.error('Error initializing top earners:', error);
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.getElementById('earners-year')?.addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.render();
        });

        document.getElementById('earners-sort')?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.render();
        });

        document.getElementById('earners-limit')?.addEventListener('change', (e) => {
            this.limit = parseInt(e.target.value);
            this.render();
        });

        document.getElementById('earners-search')?.addEventListener('input', Utils.debounce((e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.render();
        }, 200));
    },

    /**
     * Render the top earners table
     */
    render() {
        const tbody = document.getElementById('earners-tbody');
        if (!tbody) return;

        let earners = this.data[this.currentYear] || [];

        // Filter by search
        if (this.searchQuery) {
            earners = earners.filter(e =>
                (e.first_name + ' ' + e.last_name).toLowerCase().includes(this.searchQuery) ||
                (e.employer_canonical || e.employer || '').toLowerCase().includes(this.searchQuery)
            );
        }

        // Sort
        earners = [...earners].sort((a, b) => {
            if (this.sortBy === 'salary') {
                return (b.salary || b.total_comp || 0) - (a.salary || a.total_comp || 0);
            } else if (this.sortBy === 'benefits') {
                return (b.benefits || 0) - (a.benefits || 0);
            }
            return (b.total_comp || 0) - (a.total_comp || 0);
        });

        // Limit
        earners = earners.slice(0, this.limit);

        if (earners.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <div>No results found</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = earners.map((earner, index) => {
            const fullName = `${earner.first_name || ''} ${earner.last_name || ''}`.trim();
            const employer = earner.employer_canonical || earner.employer || '';
            const jobTitle = earner.job_canonical || earner.job_title || '';
            const rank = index + 1;
            const rankClass = rank <= 3 ? 'top3' : '';

            return `
                <tr>
                    <td class="col-rank">
                        <span class="rank-badge ${rankClass}">${rank}</span>
                    </td>
                    <td class="col-name">
                        <a href="#" onclick="Profiles.showIndividualProfile('${Utils.escapeHtml(fullName)}', '${Utils.escapeHtml(employer)}'); return false;">
                            ${Utils.escapeHtml(fullName)}
                        </a>
                    </td>
                    <td class="col-employer">
                        <a href="#" onclick="Profiles.showEmployerProfile('${Utils.escapeHtml(employer)}'); return false;">
                            ${Utils.escapeHtml(Utils.truncate(employer, 30))}
                        </a>
                    </td>
                    <td class="col-job">${Utils.escapeHtml(Utils.truncate(jobTitle, 25))}</td>
                    <td class="col-money">${Utils.formatCurrency(earner.salary || earner.total_comp || 0)}</td>
                    <td class="col-money">${Utils.formatCurrency(earner.benefits || 0)}</td>
                    <td class="col-money"><strong>${Utils.formatCurrency(earner.total_comp || 0)}</strong></td>
                </tr>
            `;
        }).join('');
    }
};

// Make globally available
window.TopEarners = TopEarners;
