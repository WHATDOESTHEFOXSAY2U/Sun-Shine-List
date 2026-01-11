/**
 * Top Employers Page Component
 * Shows employer rankings with filtering and sorting
 */

const TopEmployers = {
    data: null,
    yearSummary: null,
    currentYear: null,
    rankBy: 'p50',
    minHeadcount: 50,
    searchQuery: '',

    /**
     * Initialize top employers page
     */
    async init() {
        try {
            // Load search index first to get employer names
            await DataService.getSearchIndex();

            this.data = await DataService.getEmployerMetrics();
            this.yearSummary = await DataService.getYearSummary();
            const years = Utils.getYears(this.yearSummary);
            this.currentYear = years[0];

            // Populate year dropdown
            Utils.populateYearDropdown('employers-year', years, this.currentYear);

            // Setup event listeners
            this.setupEventListeners();

            // Initial render
            this.render();

        } catch (error) {
            console.error('Error initializing top employers:', error);
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.getElementById('employers-year')?.addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.render();
        });

        document.getElementById('employers-rank')?.addEventListener('change', (e) => {
            this.rankBy = e.target.value;
            this.render();
        });

        document.getElementById('employers-min-hc')?.addEventListener('change', (e) => {
            this.minHeadcount = parseInt(e.target.value);
            this.render();
        });

        document.getElementById('employers-search')?.addEventListener('input', Utils.debounce((e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.render();
        }, 200));
    },

    /**
     * Render the employers table
     */
    render() {
        const tbody = document.getElementById('employers-tbody');
        if (!tbody) return;

        let employers = DataService.getEmployersForYear(this.data, this.currentYear);

        // Filter by minimum headcount
        employers = employers.filter(e => (e.headcount || 0) >= this.minHeadcount);

        // Filter by search
        if (this.searchQuery) {
            employers = employers.filter(e =>
                e.name?.toLowerCase().includes(this.searchQuery)
            );
        }

        // Sort by selected metric
        employers = [...employers].sort((a, b) => {
            return (b[this.rankBy] || 0) - (a[this.rankBy] || 0);
        });

        // Limit to top 100
        employers = employers.slice(0, 100);

        if (employers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <div class="empty-state-icon">🏢</div>
                        <div>No employers found matching your criteria</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = employers.map((emp, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? 'top3' : '';

            return `
                <tr onclick="Profiles.showEmployerProfile('${Utils.escapeHtml(emp.id)}')" style="cursor: pointer;">
                    <td class="col-rank">
                        <span class="rank-badge ${rankClass}">${rank}</span>
                    </td>
                    <td class="col-name">${Utils.escapeHtml(Utils.truncate(emp.name, 40))}</td>
                    <td class="col-sector">${Utils.escapeHtml(Utils.truncate(emp.sector || 'Unknown', 25))}</td>
                    <td class="col-number">${Utils.formatNumber(emp.headcount || 0)}</td>
                    <td class="col-money">${Utils.formatCurrency(emp.mean_pay || 0)}</td>
                    <td class="col-money">${Utils.formatCurrency(emp.p50 || 0)}</td>
                    <td class="col-money">${Utils.formatCurrency(emp.p75 || 0)}</td>
                    <td class="col-money">${Utils.formatCurrency(emp.p90 || 0)}</td>
                </tr>
            `;
        }).join('');
    }
};

// Make globally available
window.TopEmployers = TopEmployers;
