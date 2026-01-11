/**
 * Sectors Page Component
 * Sector comparison table and charts
 */

const Sectors = {
    data: null,
    yearSummary: null,
    currentYear: null,
    selectedSectors: [],

    /**
     * Initialize sectors page
     */
    async init() {
        try {
            this.data = await DataService.getSectorMetrics();
            this.yearSummary = await DataService.getYearSummary();
            const years = Utils.getYears(this.yearSummary);
            this.currentYear = years[0];

            // Populate year dropdown
            Utils.populateYearDropdown('sectors-year', years, this.currentYear);

            // Setup event listeners
            this.setupEventListeners();

            // Initial render
            this.render();

        } catch (error) {
            console.error('Error initializing sectors:', error);
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.getElementById('sectors-year')?.addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.render();
        });
    },

    /**
     * Render sectors page
     */
    render() {
        this.renderTable();
        this.renderSectorToggles();
        this.renderSectorChart();
    },

    /**
     * Render sectors table
     */
    renderTable() {
        const tbody = document.getElementById('sectors-tbody');
        if (!tbody) return;

        const sectors = DataService.getSectorsForYear(this.data, this.currentYear);

        if (sectors.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <div>No sector data available for this year</div>
                    </td>
                </tr>
            `;
            return;
        }

        // Calculate total payroll for percentage
        const totalPayroll = sectors.reduce((sum, s) => sum + ((s.headcount || 0) * (s.mean_pay || s.median_pay || 0)), 0);

        tbody.innerHTML = sectors.map(sector => {
            const hcDelta = Utils.formatDelta(sector.yoy_headcount_growth || 0);
            const payDelta = Utils.formatDelta(sector.yoy_pay_growth || 0);
            const sectorPayroll = (sector.headcount || 0) * (sector.mean_pay || sector.median_pay || 0);
            const payrollPct = totalPayroll > 0 ? ((sectorPayroll / totalPayroll) * 100).toFixed(1) : 0;

            return `
                <tr>
                    <td class="col-name">${Utils.escapeHtml(Utils.truncate(sector.name, 35))}</td>
                    <td class="col-number">${Utils.formatNumber(sector.headcount || 0)}</td>
                    <td class="col-money">${Utils.formatCurrency(sector.median_pay || sector.p50 || 0)}</td>
                    <td class="col-money">${Utils.formatCurrency(sector.p90 || 0)}</td>
                    <td class="col-payroll">
                        <span class="payroll-value">${Utils.formatCurrency(sectorPayroll, true)}</span>
                        <span class="payroll-pct">(${payrollPct}%)</span>
                    </td>
                    <td class="col-delta">
                        <span class="${hcDelta.class}">${hcDelta.text}</span>
                    </td>
                    <td class="col-delta">
                        <span class="${payDelta.class}">${payDelta.text}</span>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Render sector toggle buttons
     */
    renderSectorToggles() {
        const container = document.getElementById('sector-toggles');
        if (!container) return;

        const sectorNames = Object.keys(this.data).filter(k => k !== '_overall').slice(0, 15);

        // Default select first 3
        if (this.selectedSectors.length === 0) {
            this.selectedSectors = sectorNames.slice(0, 3);
        }

        container.innerHTML = sectorNames.map(name => {
            const isActive = this.selectedSectors.includes(name);
            return `
                <button class="sector-toggle ${isActive ? 'active' : ''}" 
                        onclick="Sectors.toggleSector('${Utils.escapeHtml(name)}')">
                    ${Utils.escapeHtml(Utils.truncate(name, 20))}
                </button>
            `;
        }).join('');
    },

    /**
     * Toggle sector selection
     */
    toggleSector(name) {
        if (this.selectedSectors.includes(name)) {
            this.selectedSectors = this.selectedSectors.filter(s => s !== name);
        } else {
            this.selectedSectors.push(name);
        }

        this.renderSectorToggles();
        this.renderSectorChart();
    },

    /**
     * Render sector comparison chart
     */
    renderSectorChart() {
        if (!this.selectedSectors.length) return;

        const years = Utils.getYears(this.yearSummary).reverse();

        const sectorData = this.selectedSectors.map(name => {
            const sector = this.data[name];
            if (!sector || !sector.years) return { name, values: [] };

            return {
                name: Utils.truncate(name, 20),
                values: years.map(year => {
                    const yearStr = String(year);
                    const yearData = sector.years[yearStr] || sector.years[year];
                    return yearData?.median_pay || yearData?.p50 || null;
                })
            };
        });

        Charts.createSectorChart('sector-chart', years, sectorData);
    }
};

// Make globally available
window.Sectors = Sectors;
