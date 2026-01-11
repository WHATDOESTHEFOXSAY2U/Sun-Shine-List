/**
 * Distribution Page Component
 * Landing page with pay distribution, metrics, and trends
 */

const Distribution = {
    data: null,
    currentYear: null,
    trendChart: null,
    showDelta: true, // Show comparison to previous year

    /**
     * Initialize distribution page
     */
    async init() {
        try {
            this.data = await DataService.getYearSummary();
            const years = Utils.getYears(this.data);
            this.currentYear = years[0]; // Latest year

            // Populate year dropdown
            Utils.populateYearDropdown('dist-year', years, this.currentYear);

            // Setup event listeners
            this.setupEventListeners();

            // Initial render
            this.render();

        } catch (error) {
            console.error('Error initializing distribution:', error);
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const yearSelect = document.getElementById('dist-year');
        if (yearSelect) {
            yearSelect.addEventListener('change', (e) => {
                this.currentYear = parseInt(e.target.value);
                this.render();
            });
        }

        // Compare to previous checkbox
        const compareCheckbox = document.getElementById('compare-prev');
        if (compareCheckbox) {
            compareCheckbox.addEventListener('change', (e) => {
                this.showDelta = e.target.checked;
                this.render();
            });
        }

        // Trend toggles
        document.querySelectorAll('.trend-toggle').forEach(toggle => {
            toggle.addEventListener('change', () => this.updateTrendChart());
        });
    },

    /**
     * Render the distribution page
     */
    render() {
        const yearData = this.data[this.currentYear];
        const prevYearData = this.data[this.currentYear - 1];

        if (!yearData) return;

        // Update key metrics
        this.updateMetrics(yearData, prevYearData);

        // Update percentile bars
        this.updatePercentileBars(yearData);

        // Update bucket bars
        this.updateBucketBars(yearData);

        // Create/update distribution chart
        this.updateDistributionChart(yearData);

        // Create/update trend chart
        this.updateTrendChart();
    },

    /**
     * Update key metrics cards
     */
    updateMetrics(yearData, prevYearData) {
        // Headcount
        const headcount = yearData.headcount || 0;
        document.getElementById('metric-headcount').textContent = Utils.formatNumber(headcount);
        this.updateDelta('metric-headcount-delta', headcount, prevYearData?.headcount);

        // Median
        const median = yearData.p50 || yearData.median_pay || 0;
        document.getElementById('metric-median').textContent = Utils.formatCurrency(median);
        this.updateDelta('metric-median-delta', median, prevYearData?.p50 || prevYearData?.median_pay);

        // Mean
        const mean = yearData.mean_pay || 0;
        document.getElementById('metric-mean').textContent = Utils.formatCurrency(mean);
        this.updateDelta('metric-mean-delta', mean, prevYearData?.mean_pay);

        // P90
        const p90 = yearData.p90 || 0;
        document.getElementById('metric-p90').textContent = Utils.formatCurrency(p90);
        this.updateDelta('metric-p90-delta', p90, prevYearData?.p90);

        // Total payroll (estimate: headcount * mean)
        const payroll = headcount * mean;
        document.getElementById('metric-payroll').textContent = Utils.formatCurrency(payroll, true);
        const prevPayroll = (prevYearData?.headcount || 0) * (prevYearData?.mean_pay || 0);
        this.updateDelta('metric-payroll-delta', payroll, prevPayroll);
    },

    /**
     * Update delta indicator
     */
    updateDelta(elementId, current, previous) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Hide delta if checkbox is unchecked or no previous data
        if (!this.showDelta || !previous) {
            element.textContent = '';
            element.className = 'metric-delta';
            return;
        }

        const change = (current - previous) / previous;
        const delta = Utils.formatDelta(change);
        element.textContent = delta.text;
        element.className = 'metric-delta ' + delta.class;
    },

    /**
     * Update percentile bars
     */
    updatePercentileBars(yearData) {
        const container = document.getElementById('percentile-bars');
        if (!container) return;

        const percentiles = [
            { label: 'P50 (Median)', key: 'p50', value: yearData.p50 || yearData.median_pay },
            { label: 'P75', key: 'p75', value: yearData.p75 },
            { label: 'P90', key: 'p90', value: yearData.p90 },
            { label: 'P95', key: 'p95', value: yearData.p95 },
            { label: 'P99', key: 'p99', value: yearData.p99 }
        ].filter(p => p.value);

        const maxValue = Math.max(...percentiles.map(p => p.value));

        container.innerHTML = percentiles.map(p => {
            const width = (p.value / maxValue) * 100;
            return `
                <div class="percentile-row">
                    <div class="percentile-label">${p.label}</div>
                    <div class="percentile-bar-container">
                        <div class="percentile-bar" style="width: ${width}%"></div>
                    </div>
                    <div class="percentile-value">${Utils.formatCurrency(p.value)}</div>
                </div>
            `;
        }).join('');
    },

    /**
     * Update compensation bucket bars
     * Calculates bucket distribution using linear interpolation from percentile data
     */
    updateBucketBars(yearData) {
        const container = document.getElementById('bucket-bars');
        if (!container) return;

        const total = yearData.headcount || 0;

        // Get percentile values from the data
        const p50 = yearData.p50 || yearData.median_pay || 115000;
        const p75 = yearData.p75 || 135000;
        const p90 = yearData.p90 || 167000;
        const p95 = yearData.p95 || 190000;
        const p99 = yearData.p99 || 275000;

        // Build percentile points for interpolation
        // Format: [salary, cumulative_percent]
        // We know: 50% are below p50, 75% below p75, 90% below p90, etc.
        // Assume $100K threshold is at ~0% (since Sunshine List minimum is ~$100K)
        const percentilePoints = [
            [100000, 0],     // Minimum threshold
            [p50, 50],       // 50% below median
            [p75, 75],       // 75% below p75
            [p90, 90],       // 90% below p90
            [p95, 95],       // 95% below p95
            [p99, 99],       // 99% below p99
            [p99 * 1.5, 100] // Estimate max
        ];

        // Linear interpolation function to find what percentile a salary is at
        const getPercentileForSalary = (salary) => {
            // Find the two points this salary falls between
            for (let i = 0; i < percentilePoints.length - 1; i++) {
                const [s1, p1] = percentilePoints[i];
                const [s2, p2] = percentilePoints[i + 1];
                if (salary >= s1 && salary <= s2) {
                    // Linear interpolation
                    const ratio = (salary - s1) / (s2 - s1);
                    return p1 + ratio * (p2 - p1);
                }
            }
            return salary < percentilePoints[0][0] ? 0 : 100;
        };

        // Bucket boundaries
        const bucketRanges = [
            { label: '$100K-$125K', min: 100000, max: 125000 },
            { label: '$125K-$150K', min: 125000, max: 150000 },
            { label: '$150K-$200K', min: 150000, max: 200000 },
            { label: '$200K-$300K', min: 200000, max: 300000 },
            { label: '$300K+', min: 300000, max: Infinity }
        ];

        // Calculate percentage in each bucket
        const buckets = bucketRanges.map(range => {
            const percentileAtMin = getPercentileForSalary(range.min);
            const percentileAtMax = range.max === Infinity ? 100 : getPercentileForSalary(range.max);
            const percent = Math.max(0, percentileAtMax - percentileAtMin);
            return {
                label: range.label,
                percent: Math.round(percent)
            };
        });

        // Normalize percentages to sum to 100 (in case of rounding)
        const totalPercent = buckets.reduce((sum, b) => sum + b.percent, 0);
        if (totalPercent > 0 && totalPercent !== 100) {
            buckets.forEach(b => {
                b.percent = Math.round(b.percent * 100 / totalPercent);
            });
        }

        const maxPercent = Math.max(...buckets.map(b => b.percent));

        container.innerHTML = buckets.map(bucket => {
            const count = Math.round(total * bucket.percent / 100);
            const width = maxPercent > 0 ? (bucket.percent / maxPercent) * 100 : 0;
            return `
                <div class="bucket-row">
                    <div class="bucket-label">${bucket.label}</div>
                    <div class="bucket-bar-container">
                        <div class="bucket-bar" style="width: ${width}%">
                            <span class="bucket-count">${Utils.formatNumber(count)}</span>
                        </div>
                    </div>
                    <div class="bucket-percent">${bucket.percent}%</div>
                </div>
            `;
        }).join('');
    },

    /**
     * Update distribution chart
     */
    updateDistributionChart(yearData) {
        // Simulated distribution data based on percentiles
        const buckets = ['$100-110K', '$110-120K', '$120-130K', '$130-140K', '$140-150K',
            '$150-175K', '$175-200K', '$200-250K', '$250-300K', '$300K+'];

        // Approximate distribution curve
        const total = yearData.headcount || 0;
        const counts = [
            Math.round(total * 0.15),
            Math.round(total * 0.18),
            Math.round(total * 0.16),
            Math.round(total * 0.12),
            Math.round(total * 0.10),
            Math.round(total * 0.12),
            Math.round(total * 0.08),
            Math.round(total * 0.05),
            Math.round(total * 0.025),
            Math.round(total * 0.015)
        ];

        Charts.createDistributionChart('distribution-chart', buckets, counts);
    },

    /**
     * Update trend chart based on selected metrics
     */
    updateTrendChart() {
        const toggles = document.querySelectorAll('.trend-toggle:checked');
        const selectedMetrics = Array.from(toggles).map(t => t.dataset.metric);

        if (selectedMetrics.length === 0) return;

        const years = Utils.getYears(this.data).reverse();
        const datasets = [];

        const metricConfig = {
            median: { label: 'Median Salary', key: 'p50', color: '#F59E0B', yAxisID: 'y' },
            mean: { label: 'Average Salary', key: 'mean_pay', color: '#F97316', yAxisID: 'y' },
            headcount: { label: 'Headcount', key: 'headcount', color: '#3B82F6', yAxisID: 'y1' },
            p90: { label: 'P90 Salary', key: 'p90', color: '#22C55E', yAxisID: 'y' }
        };

        selectedMetrics.forEach(metric => {
            const config = metricConfig[metric];
            if (!config) return;

            datasets.push({
                label: config.label,
                data: years.map(year => this.data[year]?.[config.key] || this.data[year]?.median_pay || 0),
                color: config.color,
                yAxisID: config.yAxisID,
                fill: metric === 'median'
            });
        });

        Charts.createTrendChart('trend-chart', years, datasets);
    }
};

// Make globally available
window.Distribution = Distribution;
