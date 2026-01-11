/**
 * Chart Configurations and Factory
 * Creates and manages Chart.js instances
 */

const Charts = {
    instances: {},

    /**
     * Destroy existing chart if it exists
     */
    destroy(chartId) {
        if (this.instances[chartId]) {
            this.instances[chartId].destroy();
            delete this.instances[chartId];
        }
    },

    /**
     * Create distribution histogram chart
     */
    createDistributionChart(canvasId, buckets, counts) {
        this.destroy(canvasId);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: buckets,
                datasets: [{
                    data: counts,
                    backgroundColor: 'rgba(245, 158, 11, 0.8)',
                    borderColor: 'rgb(245, 158, 11)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(28, 25, 23, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => {
                                const total = counts.reduce((a, b) => a + b, 0);
                                const percent = ((ctx.raw / total) * 100).toFixed(1);
                                return `${Utils.formatNumber(ctx.raw)} employees (${percent}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            callback: (value) => Utils.formatNumber(value, true)
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });

        return this.instances[canvasId];
    },

    /**
     * Create trend line chart
     */
    createTrendChart(canvasId, years, datasets) {
        this.destroy(canvasId);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: datasets.map((ds, i) => ({
                    label: ds.label,
                    data: ds.data,
                    borderColor: ds.color || Utils.chartColors[i],
                    backgroundColor: ds.fill ? `${ds.color || Utils.chartColors[i]}20` : 'transparent',
                    fill: ds.fill || false,
                    tension: 0.2,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    yAxisID: ds.yAxisID || 'y'
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(28, 25, 23, 0.9)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => {
                                const value = ctx.raw;
                                if (ctx.dataset.label.includes('Headcount')) {
                                    return `${ctx.dataset.label}: ${Utils.formatNumber(value)}`;
                                }
                                return `${ctx.dataset.label}: ${Utils.formatCurrency(value)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        position: 'left',
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            callback: (value) => Utils.formatCurrency(value, true)
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                            callback: (value) => Utils.formatNumber(value, true)
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });

        return this.instances[canvasId];
    },

    /**
     * Create sector comparison chart
     */
    createSectorChart(canvasId, years, sectorData) {
        this.destroy(canvasId);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const datasets = sectorData.map((sector, i) => ({
            label: sector.name,
            data: sector.values,
            borderColor: Utils.chartColors[i % Utils.chartColors.length],
            backgroundColor: 'transparent',
            tension: 0.2,
            pointRadius: 2,
            pointHoverRadius: 5
        }));

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(28, 25, 23, 0.9)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${Utils.formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            callback: (value) => Utils.formatCurrency(value, true)
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });

        return this.instances[canvasId];
    },

    /**
     * Create simple line chart for trends
     */
    createSimpleTrendChart(canvasId, years, values, label, color) {
        this.destroy(canvasId);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: label,
                    data: values,
                    borderColor: color || Utils.chartColors[0],
                    backgroundColor: `${color || Utils.chartColors[0]}20`,
                    fill: true,
                    tension: 0.2,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(28, 25, 23, 0.9)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => {
                                if (label.includes('Headcount')) {
                                    return Utils.formatNumber(ctx.raw);
                                }
                                return Utils.formatCurrency(ctx.raw);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            callback: (value) => {
                                if (label.includes('Headcount')) {
                                    return Utils.formatNumber(value, true);
                                }
                                return Utils.formatCurrency(value, true);
                            }
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });

        return this.instances[canvasId];
    },

    /**
     * Create stacked area chart for trends (Time Travel)
     */
    createStackedAreaChart(canvasId, years, datasets, onHoverCallback) {
        this.destroy(canvasId);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: datasets.map((ds, i) => ({
                    label: ds.label,
                    data: ds.data,
                    backgroundColor: Utils.chartColors[i % Utils.chartColors.length] + 'CC', // High opacity
                    borderColor: 'rgba(255,255,255,0.5)',
                    borderWidth: 0.5,
                    fill: true,
                    tension: 0.3, // organic curves
                    pointRadius: 0, // clean look
                    pointHoverRadius: 0
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                    axis: 'x'
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { maxTicksLimit: 8 }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { display: false },
                        display: false // Clean look, focus on the big picture shape
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'center',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 15,
                            font: { size: 11 },
                            color: '#78716c' // warm-500
                        }
                    },
                    tooltip: {
                        enabled: false, // We use the external callback/cards instead
                        external: (context) => {
                            // Trigger callback on hover
                            if (onHoverCallback && context.tooltip.dataPoints && context.tooltip.dataPoints.length > 0) {
                                const index = context.tooltip.dataPoints[0].dataIndex;
                                onHoverCallback(index);
                            }
                        }
                    }
                },
                onHover: (e, elements, chart) => {
                    // Fallback for touch/mouse interaction
                    if (e.native && onHoverCallback) {
                        const points = chart.getElementsAtEventForMode(e, 'index', { intersect: false }, true);
                        if (points.length) {
                            onHoverCallback(points[0].index);
                        }
                    }
                }
            }
        });

        return this.instances[canvasId];
    },

    /**
     * Update chart data without recreating
     */
    updateChart(chartId, newData, datasetIndex = 0) {
        if (!this.instances[chartId]) return;

        this.instances[chartId].data.datasets[datasetIndex].data = newData;
        this.instances[chartId].update();
    }
};

// Make globally available
window.Charts = Charts;
