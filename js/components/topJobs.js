/**
 * Top Jobs Page Component
 * Shows job title rankings with filtering and sorting
 */

const TopJobs = {
    data: null,
    yearSummary: null,
    currentYear: null,
    rankBy: 'p50',
    minHeadcount: 10,
    searchQuery: '',

    /**
     * Initialize top jobs page
     */
    async init() {
        try {
            // Load search index first to get job titles
            await DataService.getSearchIndex();

            this.data = await DataService.getJobMetrics();
            this.yearSummary = await DataService.getYearSummary();
            const years = Utils.getYears(this.yearSummary);
            this.currentYear = years[0];

            // Populate year dropdown
            Utils.populateYearDropdown('jobs-year', years, this.currentYear);

            // Setup event listeners
            this.setupEventListeners();

            // Initial render
            this.render();

        } catch (error) {
            console.error('Error initializing top jobs:', error);
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.getElementById('jobs-year')?.addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.render();
        });

        document.getElementById('jobs-rank')?.addEventListener('change', (e) => {
            this.rankBy = e.target.value;
            this.render();
        });

        document.getElementById('jobs-min-hc')?.addEventListener('change', (e) => {
            this.minHeadcount = parseInt(e.target.value);
            this.render();
        });

        document.getElementById('jobs-search')?.addEventListener('input', Utils.debounce((e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.render();
        }, 200));
    },

    /**
     * Render the jobs table
     */
    render() {
        const tbody = document.getElementById('jobs-tbody');
        if (!tbody) return;

        let jobs = DataService.getJobsForYear(this.data, this.currentYear);

        // Filter by minimum headcount
        jobs = jobs.filter(j => (j.headcount || 0) >= this.minHeadcount);

        // Filter by search
        if (this.searchQuery) {
            jobs = jobs.filter(j =>
                j.title?.toLowerCase().includes(this.searchQuery) ||
                j.family?.toLowerCase().includes(this.searchQuery)
            );
        }

        // Sort by selected metric
        jobs = [...jobs].sort((a, b) => {
            return (b[this.rankBy] || 0) - (a[this.rankBy] || 0);
        });

        // Limit to top 100
        jobs = jobs.slice(0, 100);

        if (jobs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <div class="empty-state-icon">💼</div>
                        <div>No job titles found matching your criteria</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = jobs.map((job, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? 'top3' : '';

            return `
                <tr>
                    <td class="col-rank">
                        <span class="rank-badge ${rankClass}">${rank}</span>
                    </td>
                    <td class="col-name">${Utils.escapeHtml(Utils.truncate(job.title, 40))}</td>
                    <td class="col-family">${Utils.escapeHtml(job.family || 'Other')}</td>
                    <td class="col-number">${Utils.formatNumber(job.headcount || 0)}</td>
                    <td class="col-money">${Utils.formatCurrency(job.mean_pay || 0)}</td>
                    <td class="col-money">${Utils.formatCurrency(job.p50 || 0)}</td>
                    <td class="col-money">${Utils.formatCurrency(job.p75 || 0)}</td>
                    <td class="col-money">${Utils.formatCurrency(job.p90 || 0)}</td>
                </tr>
            `;
        }).join('');
    }
};

// Make globally available
window.TopJobs = TopJobs;
