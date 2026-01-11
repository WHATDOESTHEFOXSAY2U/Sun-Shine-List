/**
 * Find Your Employer Page Component
 * Weighted ranking tool with Pay/Stay/Grow sliders
 */

const FindEmployer = {
    data: null,
    yearSummary: null,
    currentYear: null,
    weights: { pay: 40, stay: 30, grow: 30 },
    lastTouched: { pay: 0, stay: 0, grow: 0 }, // Timestamp of last manual edit
    minHeadcount: 50,

    /**
     * Initialize find employer page
     */
    async init() {
        try {
            // Load search index first to get employer names
            await DataService.getSearchIndex();

            this.data = await DataService.getEmployerMetrics();
            this.yearSummary = await DataService.getYearSummary();
            const years = Utils.getYears(this.yearSummary);
            this.currentYear = years[0];

            // Initialize lastTouched to now
            const now = Date.now();
            this.lastTouched = { pay: now, stay: now, grow: now };

            // Populate year dropdown
            Utils.populateYearDropdown('finder-year', years, this.currentYear);

            // Setup event listeners
            this.setupEventListeners();

            // Initial render
            this.render();

        } catch (error) {
            console.error('Error initializing find employer:', error);
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Year select
        document.getElementById('finder-year')?.addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.render();
        });

        // Min headcount
        document.getElementById('finder-min-hc')?.addEventListener('change', (e) => {
            this.minHeadcount = parseInt(e.target.value);
            this.render();
        });

        // Sliders & Inputs
        const sliders = ['pay', 'stay', 'grow'];
        sliders.forEach(name => {
            const slider = document.getElementById(`slider-${name}`);
            const input = document.getElementById(`${name}-input`);

            if (slider) {
                slider.addEventListener('input', (e) => {
                    this.handleMetricChange(name, parseInt(e.target.value));
                });
            }

            if (input) {
                input.addEventListener('change', (e) => {
                    let val = parseInt(e.target.value);
                    if (isNaN(val)) val = 0;
                    if (val < 0) val = 0;
                    if (val > 100) val = 100;
                    this.handleMetricChange(name, val);
                });
            }
        });
    },

    /**
     * Handle metric changes with "Resistance" logic
     * The metric that hasn't been touched for the longest time absorbs the change first.
     */
    handleMetricChange(changed, newValue) {
        // 1. Clamp new value
        newValue = Math.max(0, Math.min(100, newValue));

        const oldValue = this.weights[changed];
        if (oldValue === newValue) return;

        // Update timestamp for the changed metric
        this.lastTouched[changed] = Date.now();
        this.weights[changed] = newValue;

        // 2. Calculate how much we need to adjust others
        // Target sum is 100.
        // Current sum of others needs to be (100 - newValue).
        let targetOtherSum = 100 - newValue;

        const others = Object.keys(this.weights).filter(k => k !== changed);

        // Sort others by staleness (Oldest timestamp first)
        // Smaller timestamp = Older = More Stale = First to change
        others.sort((a, b) => this.lastTouched[a] - this.lastTouched[b]);

        // 3. Distribute the required change
        let currentOtherSum = others.reduce((sum, k) => sum + this.weights[k], 0);
        let diff = currentOtherSum - targetOtherSum; // Amount to REMOVE from others

        // If diff is positive, we need to reduce others.
        // If diff is negative, we need to increase others.

        for (const key of others) {
            if (diff === 0) break;

            let val = this.weights[key];

            if (diff > 0) {
                // Determine how much we can reduce this metric (can't go below 0)
                let reduceBy = Math.min(diff, val);
                this.weights[key] -= reduceBy;
                diff -= reduceBy;
            } else {
                // Determine how much we can increase this metric (can't go above 100 - others)
                // Actually constraint is just staying within [0, 100].
                // We need to ADD abs(diff).
                // Let's just add it. If it overflows 100 (unlikely given logic), we handle next?
                // Actually, the main constraint is we shouldn't make any single value > 100.
                // But since sum is 100, no single value can exceed 100 implies others are negative, which we prevent.

                let increaseBy = Math.abs(diff); // Take all if possible
                let space = 100 - this.weights[key]; // Theoretical max space
                // But practical space is limited by preserving other values? 
                // No, just fill the bucket.

                let actualIncrease = Math.min(increaseBy, space);
                this.weights[key] += actualIncrease;
                diff += actualIncrease; // reduce magnitude of negative diff
            }
        }

        // Final sanity check (rounding errors etc)
        // Force the last one to fit exactly if any remainder
        const last = others[others.length - 1]; // This is the MOST RECENTLY TOUCHED of the others
        // Ideally we shouldn't touch it, but we must ensure sum=100.
        const currentTotal = Object.values(this.weights).reduce((a, b) => a + b, 0);
        if (currentTotal !== 100) {
            this.weights[last] += (100 - currentTotal);
        }

        // Update UI
        this.updateSliderUI();
        this.render();
    },

    /**
     * Update slider UI values
     */
    updateSliderUI() {
        Object.entries(this.weights).forEach(([name, value]) => {
            const slider = document.getElementById(`slider-${name}`);
            const input = document.getElementById(`${name}-input`);

            if (slider) slider.value = value;
            if (input) input.value = value;
        });
    },

    /**
     * Render employer rankings
     */
    render() {
        const container = document.getElementById('finder-results');
        if (!container) return;

        let employers = DataService.getEmployersForYear(this.data, this.currentYear);

        // Filter by minimum headcount
        employers = employers.filter(e => (e.headcount || 0) >= this.minHeadcount);

        if (employers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏢</div>
                    <div>No employers found matching your criteria</div>
                </div>
            `;
            return;
        }

        // Calculate scores
        const scored = DataService.calculateEmployerScores(employers, this.weights);

        // Take top 20
        const top = scored.slice(0, 20);

        container.innerHTML = top.map((emp, index) => {
            const retention = (emp.retention_rate || 0) * 100;
            const growth = (emp.median_growth || 0) * 100;

            // Format retention and growth - show N/A if data is unavailable
            const retentionText = emp.retention_rate > 0 ? `${retention.toFixed(0)}%` : 'N/A';
            const growthText = emp.median_growth !== 0 ? `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%` : 'N/A';

            return `
                <div class="employer-rank-card" onclick="Profiles.showEmployerProfile('${Utils.escapeHtml(emp.id)}')">
                    <div class="employer-rank-number">${index + 1}</div>
                    <div class="employer-rank-info">
                        <div class="employer-rank-name">${Utils.escapeHtml(emp.name)}</div>
                        <div class="employer-rank-details">
                            <span class="employer-rank-detail">💰 Pay: ${Utils.formatCurrency(emp.p75 || 0)}</span>
                            <span class="employer-rank-detail">🏠 Stay: ${retentionText}</span>
                            <span class="employer-rank-detail">📈 Grow: ${growthText}</span>
                        </div>
                        <div class="employer-rank-meta">${Utils.escapeHtml(emp.sector || '')} | ${Utils.formatNumber(emp.headcount || 0)} employees</div>
                    </div>
                    <div class="employer-rank-score">
                        <div class="score-label">Score</div>
                        <div class="score-value">${emp.finalScore.toFixed(1)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
};

// Make globally available
window.FindEmployer = FindEmployer;
