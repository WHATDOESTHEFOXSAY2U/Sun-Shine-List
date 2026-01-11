/**
 * Profile Modals Component
 * Employer and Individual profile views
 */

const Profiles = {
    employerData: null,
    yearSummary: null,
    topEarners: null,

    /**
     * Initialize profiles
     */
    async init() {
        try {
            this.employerData = await DataService.getEmployerMetrics();
            this.yearSummary = await DataService.getYearSummary();
            this.topEarners = await DataService.getTopEarners();
        } catch (error) {
            console.error('Error initializing profiles:', error);
        }
    },

    /**
     * Show employer profile modal
     */
    async showEmployerProfile(employerId) {
        await this.init();

        const modal = document.getElementById('employer-modal');
        const container = document.getElementById('employer-profile');
        if (!modal || !container) return;

        // Normalize employer ID - try multiple formats
        const normalizedId = String(employerId).endsWith('.0')
            ? String(employerId).slice(0, -2)
            : String(employerId);
        const idWithSuffix = normalizedId + '.0';
        const numericId = parseInt(normalizedId, 10);

        // Find employer data - it's an array of yearly records (try multiple ID formats)
        const employerRecords = this.employerData[employerId] ||
            this.employerData[idWithSuffix] ||
            this.employerData[normalizedId];
        if (!employerRecords || !Array.isArray(employerRecords) || employerRecords.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏢</div>
                    <div>Employer not found</div>
                </div>
            `;
            modal.classList.add('active');
            return;
        }

        // Get employer name from search index (try multiple ID formats)
        const employerName = DataService.employerNames[numericId] ||
            DataService.employerNames[normalizedId] ||
            DataService.employerNames[employerId] ||
            DataService.employerNames[idWithSuffix] ||
            'Unknown Employer';

        // Get sector from sector info in the records or infer from name
        const sector = this.inferSector(employerName);

        const years = Utils.getYears(this.yearSummary);
        const latestYear = years[0];

        // Find the latest year data from the records
        const latestData = employerRecords.find(r => r.year === latestYear) ||
            employerRecords.find(r => r.year === String(latestYear)) ||
            employerRecords[0] || {};

        // Calculate trend data from records
        const trendYears = years.slice(0, 10).reverse();
        const trendData = trendYears.map(y => {
            const record = employerRecords.find(r => r.year === y || r.year === String(y));
            return record?.p50 || record?.median_pay || null;
        });
        const headcountData = trendYears.map(y => {
            const record = employerRecords.find(r => r.year === y || r.year === String(y));
            return record?.headcount || null;
        });

        // Find top earners at this employer
        const employerEarners = (this.topEarners[latestYear] || [])
            .filter(e => e.employer_id === employerId ||
                e.employer_id === String(employerId) ||
                e.employer?.toLowerCase() === employerName.toLowerCase())
            .slice(0, 5);

        const retention = (latestData.retention_rate || 0) * 100;
        const growth = (latestData.growth_median || latestData.median_growth || 0) * 100;
        const hasRetention = latestData.retention_rate > 0;
        const hasGrowth = (latestData.growth_median || latestData.median_growth || 0) !== 0;

        // Calculate total payroll
        const totalPayroll = (latestData.headcount || 0) * (latestData.mean_pay || 0);

        // Calculate years of data available
        const yearsWithData = employerRecords.length;

        // Pay range for quick overview
        const payMin = latestData.p50 || 0;
        const payMax = latestData.p99 || latestData.p90 || 0;

        container.innerHTML = `
            <div class="profile-header" style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); margin: -2rem -2rem 1.5rem -2rem; padding: 2rem; border-radius: 1rem 1rem 0 0;">
                <div class="profile-icon" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); font-size: 2rem;">🏢</div>
                <div class="profile-title">
                    <div class="profile-name" style="color: #1C1917;">${Utils.escapeHtml(employerName)}</div>
                    <div class="profile-subtitle" style="color: #78716C;">
                        <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
                            <span style="background: #FEF3C7; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 600; color: #D97706;">${Utils.escapeHtml(sector)}</span>
                            <span>•</span>
                            <span>${Utils.formatNumber(latestData.headcount || 0)} employees</span>
                            <span>•</span>
                            <span>${yearsWithData} year${yearsWithData !== 1 ? 's' : ''} of data</span>
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- Quick Pay Overview -->
            <div style="background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%); border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem; color: white; text-align: center;">
                <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">💰 Compensation Range</div>
                <div style="font-size: 1.75rem; font-weight: 700; font-family: var(--font-mono);">
                    ${Utils.formatCurrency(payMin)} — ${Utils.formatCurrency(payMax)}
                </div>
                <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.5rem;">P50 to P99 range for ${latestYear}</div>
            </div>
            
            <!-- Key Metrics Grid -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 0.75rem; padding: 1rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: #78716C; margin-bottom: 0.25rem;">📊 Median Salary</div>
                    <div style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 700; color: #1C1917;">${Utils.formatCurrency(latestData.p50 || 0)}</div>
                </div>
                <div style="background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 0.75rem; padding: 1rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: #78716C; margin-bottom: 0.25rem;">📈 Average Salary</div>
                    <div style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 700; color: #1C1917;">${Utils.formatCurrency(latestData.mean_pay || 0)}</div>
                </div>
                <div style="background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 0.75rem; padding: 1rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: #78716C; margin-bottom: 0.25rem;">💵 Total Payroll</div>
                    <div style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 700; color: #1C1917;">${Utils.formatCurrency(totalPayroll, true)}</div>
                </div>
            </div>
            
            <!-- Retention & Growth Row -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: ${hasRetention ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' : '#F5F5F4'}; border: 1px solid ${hasRetention ? '#A7F3D0' : '#E7E5E4'}; border-radius: 0.75rem; padding: 1rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: ${hasRetention ? '#059669' : '#A8A29E'}; margin-bottom: 0.25rem;">🏠 Employee Retention</div>
                    <div style="font-family: var(--font-mono); font-size: 1.5rem; font-weight: 700; color: ${hasRetention ? '#047857' : '#A8A29E'};">${hasRetention ? retention.toFixed(0) + '%' : 'N/A'}</div>
                    <div style="font-size: 0.7rem; color: ${hasRetention ? '#059669' : '#A8A29E'}; margin-top: 0.25rem;">${hasRetention ? 'of employees stayed year-over-year' : 'Data not available'}</div>
                </div>
                <div style="background: ${hasGrowth ? 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)' : '#F5F5F4'}; border: 1px solid ${hasGrowth ? '#93C5FD' : '#E7E5E4'}; border-radius: 0.75rem; padding: 1rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: ${hasGrowth ? '#2563EB' : '#A8A29E'}; margin-bottom: 0.25rem;">📈 Salary Growth</div>
                    <div style="font-family: var(--font-mono); font-size: 1.5rem; font-weight: 700; color: ${hasGrowth ? (growth >= 0 ? '#1D4ED8' : '#DC2626') : '#A8A29E'};">${hasGrowth ? (growth >= 0 ? '+' : '') + growth.toFixed(1) + '%' : 'N/A'}</div>
                    <div style="font-size: 0.7rem; color: ${hasGrowth ? '#2563EB' : '#A8A29E'}; margin-top: 0.25rem;">${hasGrowth ? 'median growth for retained employees' : 'Data not available'}</div>
                </div>
            </div>
            
            <!-- Salary Trend Chart -->
            <div class="profile-section" style="background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem;">
                <h3 class="profile-section-title" style="margin-bottom: 1rem;">📈 Salary Trend (Last 10 Years)</h3>
                <div style="height: 200px; position: relative;">
                    <canvas id="employer-trend-chart"></canvas>
                </div>
            </div>
            
            ${employerEarners.length > 0 ? `
            <!-- Top Earners -->
            <div class="profile-section" style="background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem;">
                <h3 class="profile-section-title" style="margin-bottom: 1rem;">💰 Top Earners (${latestYear})</h3>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${employerEarners.map((e, i) => `
                        <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: white; border-radius: 0.5rem; border: 1px solid #E7E5E4;">
                            <div style="width: 32px; height: 32px; background: ${i < 3 ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : '#E7E5E4'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem; color: ${i < 3 ? 'white' : '#78716C'};">${i + 1}</div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; color: #1C1917; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${Utils.escapeHtml(e.first_name + ' ' + e.last_name)}</div>
                                <div style="font-size: 0.75rem; color: #78716C; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${Utils.escapeHtml(Utils.truncate(e.job_title || '', 40))}</div>
                            </div>
                            <div style="font-family: var(--font-mono); font-weight: 700; color: #1C1917;">${Utils.formatCurrency(e.total_comp || 0)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <!-- Pay Distribution -->
            <div class="profile-section" style="background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 0.75rem; padding: 1.25rem;">
                <h3 class="profile-section-title" style="margin-bottom: 1rem;">📊 Pay Distribution</h3>
                <div class="percentile-bars">
                    <div class="percentile-row">
                        <div class="percentile-label">P50</div>
                        <div class="percentile-bar-container">
                            <div class="percentile-bar" style="width: ${((latestData.p50 || 0) / (latestData.p99 || latestData.p90 || 1)) * 100}%"></div>
                        </div>
                        <div class="percentile-value">${Utils.formatCurrency(latestData.p50 || 0)}</div>
                    </div>
                    <div class="percentile-row">
                        <div class="percentile-label">P75</div>
                        <div class="percentile-bar-container">
                            <div class="percentile-bar" style="width: ${((latestData.p75 || 0) / (latestData.p99 || latestData.p90 || 1)) * 100}%"></div>
                        </div>
                        <div class="percentile-value">${Utils.formatCurrency(latestData.p75 || 0)}</div>
                    </div>
                    <div class="percentile-row">
                        <div class="percentile-label">P90</div>
                        <div class="percentile-bar-container">
                            <div class="percentile-bar" style="width: ${((latestData.p90 || 0) / (latestData.p99 || latestData.p90 || 1)) * 100}%"></div>
                        </div>
                        <div class="percentile-value">${Utils.formatCurrency(latestData.p90 || 0)}</div>
                    </div>
                    <div class="percentile-row">
                        <div class="percentile-label" style="font-weight: 600;">P99</div>
                        <div class="percentile-bar-container">
                            <div class="percentile-bar" style="width: 100%; background: linear-gradient(90deg, #F59E0B 0%, #F97316 100%);"></div>
                        </div>
                        <div class="percentile-value" style="font-weight: 600;">${Utils.formatCurrency(latestData.p99 || latestData.p90 || 0)}</div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('active');

        // Create trend chart after modal is visible
        setTimeout(() => {
            Charts.createTrendChart('employer-trend-chart', trendYears, [
                { label: 'Median Salary', data: trendData, color: '#F59E0B', fill: true, yAxisID: 'y' },
                { label: 'Headcount', data: headcountData, color: '#3B82F6', yAxisID: 'y1' }
            ]);
        }, 100);
    },

    /**
     * Infer sector from employer name
     */
    inferSector(employerName) {
        if (!employerName) return 'Other';
        const name = employerName.toLowerCase();

        if (name.includes('university') || name.includes('college')) return 'Universities & Colleges';
        if (name.includes('hospital') || name.includes('health') || name.includes('medical')) return 'Hospitals';
        if (name.includes('school board') || name.includes('district school')) return 'School Boards';
        if (name.includes('police')) return 'Police';
        if (name.includes('fire') || name.includes('firefighter')) return 'Fire Services';
        if (name.includes('hydro') || name.includes('power') || name.includes('energy')) return 'Energy';
        if (name.includes('city of') || name.includes('town of') || name.includes('municipality')) return 'Municipalities';
        if (name.includes('ontario') && (name.includes('ministry') || name.includes('government'))) return 'Provincial Government';
        if (name.includes('court') || name.includes('justice')) return 'Justice';

        return 'Other';
    },

    /**
     * Show individual profile modal
     */
    /**
     * Show individual profile modal
     */
    async showIndividualProfile(name, employer) {
        await this.init();

        const modal = document.getElementById('individual-modal');
        const container = document.getElementById('individual-profile');
        if (!modal || !container) return;

        // Find all records for this person across years
        const years = Utils.getYears(this.yearSummary);
        const records = [];

        for (const year of years) {
            const yearEarners = this.topEarners[year] || [];
            const matches = yearEarners.filter(e => {
                const fullName = `${e.first_name || ''} ${e.last_name || ''}`.trim().toLowerCase();
                return fullName === name.toLowerCase();
            });

            matches.forEach(m => {
                records.push({ year, ...m });
            });
        }

        if (records.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👤</div>
                    <div>No detailed records found for this individual</div>
                    <p style="margin-top: 1rem; color: var(--warm-500);">
                        Only top earners per year are indexed for individual profiles.
                    </p>
                </div>
            `;
            modal.classList.add('active');
            return;
        }

        // Sort by year descending for stats (Latest first)
        records.sort((a, b) => b.year - a.year);

        const latestRecord = records[0];
        const totalEarnings = records.reduce((sum, r) => sum + (r.total_comp || 0), 0);
        const firstYear = records[records.length - 1].year;
        const firstComp = records[records.length - 1].total_comp || 0;
        const latestComp = latestRecord.total_comp || 0;
        const totalGrowth = firstComp > 0 ? ((latestComp - firstComp) / firstComp * 100) : 0;

        // Sort by year ascending for chart (Oldest first)
        const chartRecords = [...records].sort((a, b) => a.year - b.year);
        const chartYears = chartRecords.map(r => r.year);
        const chartData = chartRecords.map(r => r.total_comp);

        container.innerHTML = `
            <div class="profile-header" style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); margin: -2rem -2rem 1.5rem -2rem; padding: 2rem; border-radius: 1rem 1rem 0 0;">
                <div class="profile-icon" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); font-size: 2rem;">👤</div>
                <div class="profile-title">
                    <div class="profile-name" style="color: #1C1917;">${Utils.escapeHtml(name)}</div>
                    <div class="profile-subtitle" style="color: #78716C;">
                         <span style="display: inline-flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <span style="background: #FEF3C7; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 600; color: #D97706;">${Utils.escapeHtml(latestRecord.employer || employer)}</span>
                            <span>•</span>
                            <span>${Utils.escapeHtml(latestRecord.job_title || '')}</span>
                        </span>
                    </div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 0.75rem; padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: #78716C; margin-bottom: 0.25rem;">latest Comp (${latestRecord.year})</div>
                    <div style="font-family: var(--font-mono); font-size: 1.5rem; font-weight: 700; color: #1C1917;">${Utils.formatCurrency(latestComp)}</div>
                </div>
                <div style="background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 0.75rem; padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: #78716C; margin-bottom: 0.25rem;">Growth Since ${firstYear}</div>
                    <div style="font-family: var(--font-mono); font-size: 1.5rem; font-weight: 700; color: ${totalGrowth >= 0 ? '#16A34A' : '#DC2626'};">${totalGrowth >= 0 ? '+' : ''}${totalGrowth.toFixed(0)}%</div>
                </div>
                <div style="background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 0.75rem; padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: #78716C; margin-bottom: 0.25rem;">Total on Sunshine List</div>
                    <div style="font-family: var(--font-mono); font-size: 1.5rem; font-weight: 700; color: #1C1917;">${Utils.formatCurrency(totalEarnings, true)}</div>
                </div>
                <div style="background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 0.75rem; padding: 1.25rem; text-align: center;">
                    <div style="font-size: 0.75rem; color: #78716C; margin-bottom: 0.25rem;">Years Listed</div>
                    <div style="font-family: var(--font-mono); font-size: 1.5rem; font-weight: 700; color: #1C1917;">${records.length}</div>
                </div>
            </div>
            
            <div class="profile-section" style="background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem;">
                <h3 class="profile-section-title" style="margin-bottom: 1rem;">📈 Salary Progression</h3>
                <div style="height: 250px; position: relative;">
                    <canvas id="individual-trend-chart"></canvas>
                </div>
            </div>
        `;

        modal.classList.add('active');

        // Render Chart
        setTimeout(() => {
            Charts.createTrendChart('individual-trend-chart', chartYears, [
                { label: 'Total Compensation', data: chartData, color: '#F59E0B', fill: true }
            ]);
        }, 100);
    }
};

/**
 * Close modal by ID
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Make globally available
window.Profiles = Profiles;
window.closeModal = closeModal;
