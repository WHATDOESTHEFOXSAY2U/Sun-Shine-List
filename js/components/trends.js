/**
 * Trends Page Component
 * "Time Travel" Dashboard
 */

const Trends = {
    data: null,
    sectorData: null,
    annualSnapshots: [], // Pre-calculated data for every year [1996...2024]
    years: [],

    /**
     * Initialize trends page
     */
    async init() {
        try {
            this.data = await DataService.getYearSummary();
            this.sectorData = await DataService.getSectorMetrics();

            // Prepare data structures for instant interaction
            this.years = Utils.getYears(this.data).reverse(); // Oldest to Newest [1996, ..., 2024]
            this.prepareSnapshots();

            // Initial render
            this.render();

        } catch (error) {
            console.error('Error initializing trends:', error);
        }
    },

    /**
     * Pre-calculate data for all cards for every year O(N)
     * This ensures the "hover" effect is instant (0ms latency)
     */
    prepareSnapshots() {
        this.annualSnapshots = this.years.map(year => {
            const yearStr = String(year);
            const globalData = this.data[year] || {}; // Overall stats

            // 1. Find Top Earner for this year (need to fetch partial data or use pre-calc)
            // Note: Since we don't have a "Max Earner" in the simple year summary, 
            // we will approximate or use the `p99` as a proxy if max isn't readily available, 
            // OR finding the sector with the max pay. 
            // *Optimization*: In a real app, we'd have `year_stats.json` containing the max earner name.
            // For now, we will use the sector max pay which we HAVE in sector metrics.

            let topEarnerPay = 0;
            let largestSector = { name: '-', count: 0 };
            let richestSector = { name: '-', median: 0 };
            let totalEmployers = 0;

            // Analyze sectors for this year
            Object.entries(this.sectorData).forEach(([name, data]) => {
                if (name === '_overall') return;
                const yd = data.years[yearStr];
                if (!yd) return;

                // Max Pay
                if ((yd.max_pay || 0) > topEarnerPay) topEarnerPay = yd.max_pay;

                // Largest Sector
                if ((yd.headcount || 0) > largestSector.count) {
                    largestSector = { name: name, count: yd.headcount };
                }

                // Richest Sector
                const median = yd.median_pay || yd.p50 || 0;
                if (median > richestSector.median) {
                    richestSector = { name: name, median: median };
                }

                // Employer Count Sum (Approximate, as `unique_employers` is per sector. 
                // Summing them might double-count, but reasonable proxy for trends).
                totalEmployers += (yd.unique_employers || 0);
            });

            // Adjust Payroll for Inflation (Simple CPI proxy: ~2% avg or hardcoded factor)
            // For true 2024 dollars: PV = Value * (IPC_2024 / IPC_Year)
            const inflationFactor = 1.0; // Placeholder for now

            return {
                year: year,
                headcount: globalData.headcount || 0,
                // Growth calculation needs previous year
                headcountGrowth: 0, // Calculated in second pass

                payroll: globalData.total_payroll || 0,

                median: globalData.median_pay || globalData.p50 || 0,

                maxPay: topEarnerPay,
                maxPayName: 'Sector Max', // We don't have individual names in this view yet

                employers: totalEmployers, // Proxy

                p99: globalData.p99 || 0,

                largestSector: largestSector.name,
                largestSectorCount: largestSector.count,

                richestSector: richestSector.name,
                richestSectorAvg: richestSector.median
            };
        });

        // Second pass for growth rates (now that we have the array)
        for (let i = 1; i < this.annualSnapshots.length; i++) {
            const curr = this.annualSnapshots[i];
            const prev = this.annualSnapshots[i - 1];
            if (prev.headcount > 0) {
                const growth = ((curr.headcount - prev.headcount) / prev.headcount) * 100;
                curr.headcountGrowth = (growth > 0 ? '+' : '') + growth.toFixed(1) + '%';
            } else {
                curr.headcountGrowth = '0%';
            }
        }
        // First year growth
        if (this.annualSnapshots.length > 0) {
            this.annualSnapshots[0].headcountGrowth = 'Base Year';
        }
    },

    /**
     * Render trends page
     */
    render() {
        this.renderStackedChart();
        // Render initial view (latest year)
        this.updateCardView(this.years.length - 1);
    },

    /**
     * 1. Render Chart
     */
    renderStackedChart() {
        const topSectors = Object.keys(this.sectorData)
            .filter(k => k !== '_overall')
            // Sort by total size (approx) so big sectors are at bottom
            .sort((a, b) => {
                const headA = this.sectorData[a].years['2024']?.headcount || 0;
                const headB = this.sectorData[b].years['2024']?.headcount || 0;
                return headB - headA;
            })
            .slice(0, 8); // Top 8 sectors to keep chart readable

        const datasets = topSectors.map(sectorName => {
            return {
                label: sectorName,
                data: this.years.map(y => {
                    const yd = this.sectorData[sectorName].years[y] || {};
                    return yd.headcount || 0;
                })
            };
        });

        // Callback function that charts.js will call on hover
        const onHover = (index) => {
            this.updateCardView(index);
        };

        Charts.createStackedAreaChart('stacked-trend-chart', this.years, datasets, onHover);
    },

    /**
     * 2. Update the Dashboard Cards (Instant)
     */
    updateCardView(index) {
        if (index < 0 || index >= this.annualSnapshots.length) return;

        const shot = this.annualSnapshots[index];

        // 1. Year Header
        const yearEl = document.getElementById('trend-current-year');
        if (yearEl) yearEl.textContent = shot.year;

        // 2. Headcount
        document.getElementById('t-headcount').textContent = Utils.formatNumber(shot.headcount);
        const growEl = document.getElementById('t-headcount-growth');
        growEl.textContent = shot.headcountGrowth;
        growEl.style.color = shot.headcountGrowth.includes('-') ? 'var(--error)' : 'var(--success)';

        // 3. Payroll
        document.getElementById('t-payroll').textContent = Utils.formatCurrency(shot.payroll, true);

        // 4. Median
        document.getElementById('t-median').textContent = Utils.formatCurrency(shot.median);

        // 5. Max (Top Earner proxy)
        document.getElementById('t-max').textContent = Utils.formatCurrency(shot.maxPay);
        document.getElementById('t-max-name').textContent = 'Highest Sector Max';

        // 6. Employers
        document.getElementById('t-employers').textContent = Utils.formatNumber(shot.employers);

        // 7. Elite P99
        document.getElementById('t-p99').textContent = Utils.formatCurrency(shot.p99);

        // 8. Largest Sector
        document.getElementById('t-large-sector').textContent = Utils.truncate(shot.largestSector, 20);
        document.getElementById('t-large-count').textContent = Utils.formatNumber(shot.largestSectorCount);

        // 9. Richest Sector
        document.getElementById('t-rich-sector').textContent = Utils.truncate(shot.richestSector, 20);
        document.getElementById('t-rich-avg').textContent = Utils.formatCurrency(shot.richestSectorAvg);
    }
};

window.Trends = Trends;
