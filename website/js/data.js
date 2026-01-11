/**
 * Data Loading and Caching Module
 * Handles fetching and caching of JSON data files
 */

const DataService = {
    // Cache for loaded data
    cache: {},

    // Employer name lookup from search index
    employerNames: {},
    jobTitles: {},

    // Base path for data files
    basePath: './data/',

    /**
     * Load a JSON data file
     */
    async load(filename) {
        if (this.cache[filename]) {
            return this.cache[filename];
        }

        try {
            const response = await fetch(this.basePath + filename);
            if (!response.ok) {
                throw new Error(`Failed to load ${filename}: ${response.status}`);
            }
            const data = await response.json();
            this.cache[filename] = data;
            return data;
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            throw error;
        }
    },

    /**
     * Load year summary data
     * Converts array format to object keyed by year and normalizes field names
     */
    async getYearSummary() {
        const data = await this.load('year_summary.json');

        // Convert array to object keyed by year
        if (Array.isArray(data)) {
            const result = {};
            data.forEach(item => {
                result[item.year] = {
                    year: item.year,
                    headcount: item.count,
                    mean_pay: item.mean,
                    p50: item.p50,
                    median_pay: item.p50,
                    p75: item.p75,
                    p90: item.p90,
                    p95: item.p95,
                    p99: item.p99,
                    total_payroll: item.count * item.mean
                };
            });
            this.cache['year_summary_processed'] = result;
            return result;
        }

        return data;
    },

    /**
     * Load top earners data
     */
    async getTopEarners() {
        return this.load('top_earners.json');
    },

    /**
     * Load employer metrics
     */
    async getEmployerMetrics() {
        return this.load('employer_metrics.json');
    },

    /**
     * Load job metrics
     */
    async getJobMetrics() {
        return this.load('job_metrics.json');
    },

    /**
     * Load sector metrics
     */
    async getSectorMetrics() {
        return this.load('sector_metrics.json');
    },

    /**
     * Load search index and build name lookup maps
     */
    async getSearchIndex() {
        const data = await this.load('search_index.json');

        // Build employer name lookup
        if (data.employers && Array.isArray(data.employers)) {
            data.employers.forEach(emp => {
                this.employerNames[emp.id] = emp.name;
            });
        }

        // Build job title lookup
        if (data.jobs && Array.isArray(data.jobs)) {
            data.jobs.forEach(job => {
                this.jobTitles[job.id] = { title: job.title, family: job.family };
            });
        }

        return data;
    },

    /**
     * Load all required data
     */
    async loadAll() {
        const results = await Promise.all([
            this.getYearSummary(),
            this.getTopEarners(),
            this.getEmployerMetrics(),
            this.getJobMetrics(),
            this.getSectorMetrics(),
            this.getSearchIndex()
        ]);

        return {
            yearSummary: results[0],
            topEarners: results[1],
            employerMetrics: results[2],
            jobMetrics: results[3],
            sectorMetrics: results[4],
            searchIndex: results[5]
        };
    },

    /**
     * Infer sector from employer name
     */
    inferSector(employerName) {
        if (!employerName || typeof employerName !== 'string') return 'Other';
        const name = employerName.toLowerCase();

        if (name.includes('university') || name.includes('college')) return 'Universities & Colleges';
        if (name.includes('hospital') || name.includes('health') || name.includes('medical')) return 'Hospitals';
        if (name.includes('school board') || name.includes('district school')) return 'School Boards';
        if (name.includes('police')) return 'Police';
        if (name.includes('fire') || name.includes('firefighter')) return 'Fire Services';
        if (name.includes('hydro') || name.includes('power') || name.includes('energy')) return 'Energy';
        if (name.includes('city of') || name.includes('town of') || name.includes('municipality') || name.includes('region of')) return 'Municipalities';
        if (name.includes('ontario') && (name.includes('ministry') || name.includes('government'))) return 'Provincial Government';
        if (name.includes('court') || name.includes('justice')) return 'Justice';
        if (name.includes('library')) return 'Libraries';
        if (name.includes('transit') || name.includes('transportation')) return 'Transit';

        return 'Other';
    },

    /**
     * Get employers for a specific year with metrics
     * employer_metrics.json structure: { "employer_id": [array of yearly records] }
     * Each record has: employer_id, year, headcount, mean_pay, p50, p75, p90, p99, stayed_count, retention_rate, growth_median
     */
    getEmployersForYear(employerMetrics, year) {
        const employers = [];
        const yearStr = String(year);
        const yearNum = Number(year);

        for (const [employerId, records] of Object.entries(employerMetrics)) {
            // records is an array of year data
            if (!Array.isArray(records)) continue;

            // Find the record for this year
            const yearRecord = records.find(r => r.year === yearNum || r.year === yearStr);
            if (!yearRecord) continue;

            // Normalize employer ID (strip .0 suffix if present)
            const normalizedId = employerId.endsWith('.0')
                ? employerId.slice(0, -2)
                : employerId;
            const numericId = parseInt(normalizedId, 10);

            // Get employer name from search index (try multiple ID formats)
            const name = this.employerNames[numericId] ||
                this.employerNames[normalizedId] ||
                this.employerNames[employerId] ||
                employerId;

            // Infer sector from employer name
            const sector = this.inferSector(name);

            employers.push({
                id: employerId,
                name: name,
                sector: sector,
                headcount: yearRecord.headcount || 0,
                mean_pay: yearRecord.mean_pay || 0,
                p50: yearRecord.p50 || 0,
                p75: yearRecord.p75 || 0,
                p90: yearRecord.p90 || 0,
                p99: yearRecord.p99 || 0,
                retention_rate: yearRecord.retention_rate || 0,
                median_growth: yearRecord.growth_median || 0
            });
        }

        return employers;
    },

    /**
     * Get jobs for a specific year with metrics
     * job_metrics.json structure: similar to employer_metrics
     */
    getJobsForYear(jobMetrics, year) {
        const jobs = [];
        const yearNum = Number(year);

        for (const [jobId, records] of Object.entries(jobMetrics)) {
            if (!Array.isArray(records)) continue;

            // Find the record for this year
            const yearRecord = records.find(r => r.year === yearNum);
            if (!yearRecord) continue;

            // Get job title from search index
            const jobInfo = this.jobTitles[jobId] || this.jobTitles[Number(jobId)] || { title: jobId, family: 'Other' };

            jobs.push({
                id: jobId,
                title: jobInfo.title,
                family: jobInfo.family || 'Other',
                headcount: yearRecord.headcount || 0,
                mean_pay: yearRecord.mean_pay || 0,
                p50: yearRecord.p50 || 0,
                p75: yearRecord.p75 || 0,
                p90: yearRecord.p90 || 0,
                p99: yearRecord.p99 || 0
            });
        }

        return jobs;
    },

    /**
     * Get sectors for a specific year
     * sector_metrics.json structure: { "sector_name": { "years": { "2024": {...} } } }
     */
    getSectorsForYear(sectorMetrics, year) {
        const sectors = [];
        const yearStr = String(year);

        for (const [sectorName, data] of Object.entries(sectorMetrics)) {
            if (sectorName === '_overall') continue;
            if (!data.years || !data.years[yearStr]) continue;

            const yearData = data.years[yearStr];
            sectors.push({
                name: sectorName,
                topJobs: data.top_job_titles || [],
                headcount: yearData.headcount || 0,
                mean_pay: yearData.mean_pay || 0,
                median_pay: yearData.median_pay || yearData.p50 || 0,
                p50: yearData.p50 || yearData.median_pay || 0,
                p90: yearData.p90 || 0,
                total_payroll: yearData.total_payroll || 0,
                yoy_headcount_growth: yearData.yoy_headcount_growth || 0,
                yoy_pay_growth: yearData.yoy_pay_growth || 0
            });
        }

        return sectors.sort((a, b) => b.headcount - a.headcount);
    },

    /**
     * Calculate employer scores for "Find Your Employer"
     */
    calculateEmployerScores(employers, weights) {
        if (!employers.length) return [];

        // Find min/max for normalization (only from non-zero values)
        const p75Values = employers.map(e => e.p75 || 0);
        const retentionValues = employers.map(e => e.retention_rate || 0).filter(v => v > 0);
        const growthValues = employers.map(e => e.median_growth || 0).filter(v => v !== 0);

        const stats = {
            minP75: Math.min(...p75Values),
            maxP75: Math.max(...p75Values),
            // For retention and growth, use 0-1 range if no data exists
            minRetention: retentionValues.length > 0 ? Math.min(...retentionValues) : 0,
            maxRetention: retentionValues.length > 0 ? Math.max(...retentionValues) : 1,
            minGrowth: growthValues.length > 0 ? Math.min(...growthValues) : 0,
            maxGrowth: growthValues.length > 0 ? Math.max(...growthValues) : 0.1,
            hasRetentionData: retentionValues.length > 0,
            hasGrowthData: growthValues.length > 0
        };

        return employers.map(employer => {
            // Pay score (normalized 0-100)
            const payScore = Utils.normalize(employer.p75 || 0, stats.minP75, stats.maxP75);

            // Stay score (retention rate - already 0-1, scale to 0-100)
            // If employer has retention data, normalize it; otherwise give a middle score
            let stayScore;
            if (employer.retention_rate > 0) {
                stayScore = Utils.normalize(employer.retention_rate, stats.minRetention, stats.maxRetention);
            } else {
                // No data available - assign neutral score
                stayScore = stats.hasRetentionData ? 25 : 50; // Lower if others have data
            }

            // Growth score (normalized 0-100)
            let growScore;
            if (employer.median_growth !== 0) {
                growScore = Utils.normalize(employer.median_growth || 0, stats.minGrowth, stats.maxGrowth);
            } else {
                // No data available - assign neutral score
                growScore = stats.hasGrowthData ? 25 : 50;
            }

            // Weighted composite (0-100 scale)
            const finalScore = (
                (payScore * weights.pay / 100) +
                (stayScore * weights.stay / 100) +
                (growScore * weights.grow / 100)
            );

            return {
                ...employer,
                payScore,
                stayScore,
                growScore,
                finalScore
            };
        }).sort((a, b) => b.finalScore - a.finalScore);
    }
};

// Make globally available
window.DataService = DataService;
