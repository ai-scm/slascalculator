const { createCanvas } = require('canvas');
const ChartJS = require('chart.js');

// Registrar componentes de Chart.js con canvas
ChartJS.Chart.register(
  ChartJS.BarController,
  ChartJS.LineController,
  ChartJS.DoughnutController,
  ChartJS.PieController,
  ChartJS.CategoryScale,
  ChartJS.LinearScale,
  ChartJS.PointElement,
  ChartJS.LineElement,
  ChartJS.BarElement,
  ChartJS.ArcElement,
  ChartJS.Title,
  ChartJS.Tooltip,
  ChartJS.Legend,
  ChartJS.Filler
);

class ChartGeneratorService {
  /**
   * Generar imagen de gráfico SLA Trend (Línea)
   * @param {Object} data - { labels, firstResponse, resolution }
   * @returns {Buffer} PNG buffer
   */
  async generateSLATrendChart(data) {
    try {
      const { labels = [], firstResponse = [], resolution = [] } = data;
      
      if (labels.length === 0) {
        console.warn('⚠️ No data for SLA Trend chart');
        return null;
      }

      const canvas = createCanvas(1000, 500);
      const ctx = canvas.getContext('2d');

      new ChartJS.Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Primera Respuesta',
              data: firstResponse,
              borderColor: '#4DD4D4',
              backgroundColor: 'rgba(77, 212, 212, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 3,
              borderWidth: 2,
            },
            {
              label: 'Resolución',
              data: resolution,
              borderColor: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.4,
              fill: true,
              pointRadius: 3,
              borderWidth: 2,
            }
          ]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { font: { size: 11 }, padding: 15 }
            },
            title: {
              display: true,
              text: 'Tendencia de Cumplimiento SLA',
              font: { size: 14, weight: 'bold' }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: { callback: (v) => v + '%', font: { size: 10 } }
            },
            x: { ticks: { font: { size: 10 } } }
          }
        }
      });

      return canvas.toBuffer('image/png');
    } catch (error) {
      console.error('Error generando SLA Trend chart:', error);
      return null;
    }
  }

  /**
   * Generar imagen de gráfico de Estado (Doughnut)
   * @param {Object} data - { labels, values, colors }
   * @returns {Buffer} PNG buffer
   */
  async generateStatusChart(data) {
    try {
      const { labels = [], values = [], colors = [] } = data;
      
      if (labels.length === 0) {
        console.warn('⚠️ No data for Status chart');
        return null;
      }

      const palette = colors.length > 0 ? colors : this.getDefaultPalette(labels.length);

      const canvas = createCanvas(900, 500);
      const ctx = canvas.getContext('2d');

      new ChartJS.Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: palette,
              borderColor: palette,
              borderWidth: 0,
              hoverOffset: 6
            }
          ]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { font: { size: 11 }, padding: 15 }
            },
            title: {
              display: true,
              text: 'Estado de Casos',
              font: { size: 14, weight: 'bold' }
            }
          }
        }
      });

      return canvas.toBuffer('image/png');
    } catch (error) {
      console.error('Error generando Status chart:', error);
      return null;
    }
  }

  /**
   * Generar imagen de gráfico de Métricas por Agente (Barra)
   * @param {Object} data - { agents, first_response_met, resolution_met, first_response_breached, resolution_breached }
   * @returns {Buffer} PNG buffer
   */
  async generateAgentMetricsChart(data) {
    try {
      const { agents = [], first_response_met = [], resolution_met = [] } = data;
      
      if (agents.length === 0) {
        console.warn('⚠️ No data for Agent Metrics chart');
        return null;
      }

      const canvas = createCanvas(1000, 500);
      const ctx = canvas.getContext('2d');

      new ChartJS.Chart(ctx, {
        type: 'bar',
        data: {
          labels: agents.slice(0, 15), // Top 15 agentes
          datasets: [
            {
              label: '1ra Respuesta - Cumplido',
              data: first_response_met.slice(0, 15),
              backgroundColor: '#10B981',
              borderRadius: 4,
            },
            {
              label: 'Resolución - Cumplido',
              data: resolution_met.slice(0, 15),
              backgroundColor: '#4DD4D4',
              borderRadius: 4,
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { font: { size: 11 }, padding: 15 }
            },
            title: {
              display: true,
              text: 'Top Agentes - SLA Cumplido',
              font: { size: 14, weight: 'bold' }
            }
          },
          scales: {
            x: { beginAtZero: true, ticks: { font: { size: 10 } } },
            y: { ticks: { font: { size: 9 } } }
          }
        }
      });

      return canvas.toBuffer('image/png');
    } catch (error) {
      console.error('Error generando Agent Metrics chart:', error);
      return null;
    }
  }

  /**
   * Generar imagen de gráfico de Distribución por Tipo (Barra)
   * @param {Object} data - { types, values }
   * @returns {Buffer} PNG buffer
   */
  async generateTypeDistributionChart(data) {
    try {
      const { types = [], values = [] } = data;
      
      if (types.length === 0) {
        console.warn('⚠️ No data for Type Distribution chart');
        return null;
      }

      const canvas = createCanvas(1000, 500);
      const ctx = canvas.getContext('2d');

      new ChartJS.Chart(ctx, {
        type: 'bar',
        data: {
          labels: types,
          datasets: [
            {
              label: 'Total Tickets',
              data: values,
              backgroundColor: [
                '#F97316',
                '#8B5CF6',
                '#0EA5E9',
                '#EC4899',
                '#FBBF24',
                '#34D399',
                '#6366F1'
              ],
              borderRadius: 4,
              borderWidth: 0
            }
          ]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, labels: { font: { size: 11 } } },
            title: {
              display: true,
              text: 'Distribución de Tipos de Solicitud',
              font: { size: 14, weight: 'bold' }
            }
          },
          scales: {
            x: { ticks: { font: { size: 10 } } },
            y: { beginAtZero: true, ticks: { font: { size: 10 }, callback: (v) => v } }
          }
        }
      });

      return canvas.toBuffer('image/png');
    } catch (error) {
      console.error('Error generando Type Distribution chart:', error);
      return null;
    }
  }

  /**
   * Generar imagen de gráfico de Incidentes (Barra)
   * @param {Object} data - { labels, values }
   * @returns {Buffer} PNG buffer
   */
  async generateIncidentChart(data) {
    try {
      return await this.generateSimpleBarChart(data, 'Incidentes por Prioridad');
    } catch (error) {
      console.error('Error generando Incident chart:', error);
      return null;
    }
  }

  /**
   * Generar imagen de gráfico de RFC (Barra)
   * @param {Object} data - { labels, values }
   * @returns {Buffer} PNG buffer
   */
  async generateRFCChart(data) {
    try {
      return await this.generateSimpleBarChart(data, 'Solicitudes de Cambio (RFC)');
    } catch (error) {
      console.error('Error generando RFC chart:', error);
      return null;
    }
  }

  /**
   * Generar imagen de gráfico de RFI (Barra)
   * @param {Object} data - { labels, values }
   * @returns {Buffer} PNG buffer
   */
  async generateRFIChart(data) {
    try {
      return await this.generateSimpleBarChart(data, 'Solicitudes de Información (RFI)');
    } catch (error) {
      console.error('Error generando RFI chart:', error);
      return null;
    }
  }

  /**
   * Generar gráfico simple de barras (helper)
   * @private
   */
  async generateSimpleBarChart(data, title) {
    const { labels = [], values = [] } = data;
    
    if (labels.length === 0) {
      console.warn(`⚠️ No data for ${title} chart`);
      return null;
    }

    const canvas = createCanvas(900, 400);
    const ctx = canvas.getContext('2d');

    new ChartJS.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Cantidad',
            data: values,
            backgroundColor: '#0EA5E9',
            borderRadius: 4,
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: title,
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          x: { ticks: { font: { size: 9 } } },
          y: { beginAtZero: true, ticks: { font: { size: 10 } } }
        }
      }
    });

    return canvas.toBuffer('image/png');
  }

  /**
   * Generar gráfico: Tickets Atendidos por Nivel (N1 vs N2)
   * @param {Object} data - { n1Handled, n2Handled }
   * @returns {Buffer} PNG buffer
   */
  async generateLevelAttendanceChart(data) {
    try {
      const { n1Handled = 0, n2Handled = 0 } = data;

      const canvas = createCanvas(900, 400);
      const ctx = canvas.getContext('2d');

      new ChartJS.Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Nivel 1', 'Nivel 2'],
          datasets: [{
            label: 'Tickets atendidos',
            data: [n1Handled, n2Handled],
            backgroundColor: ['#38BDF8', '#F97316'],
            borderRadius: 6,
            barThickness: 100
          }]
        },
        options: {
          indexAxis: 'x',
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: 'Tickets atendidos por nivel',
              font: { size: 14, weight: 'bold' }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.parsed.y} tickets`
              }
            }
          },
          scales: {
            x: { ticks: { font: { size: 11 } }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { font: { size: 10 }, stepSize: 50 } }
          }
        }
      });

      return canvas.toBuffer('image/png');
    } catch (error) {
      console.error('Error generando Level Attendance chart:', error);
      return null;
    }
  }

  /**
   * Generar gráfico: Embudo de Escalamiento
   * @param {Object} data - { receivedN1, resolvedN1, escalatedN2 }
   * @returns {Buffer} PNG buffer
   */
  async generateEscalationFunnelChart(data) {
    try {
      const { receivedN1 = 0, resolvedN1 = 0, escalatedN2 = 0 } = data;

      const canvas = createCanvas(900, 400);
      const ctx = canvas.getContext('2d');

      new ChartJS.Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Recibidos en N1', 'Resueltos en N1', 'Escalados a N2'],
          datasets: [{
            label: 'Tickets',
            data: [receivedN1, resolvedN1, escalatedN2],
            backgroundColor: ['#94A3B8', '#38BDF8', '#F97316'],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: 'Embudo de escalamiento',
              font: { size: 14, weight: 'bold' }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.parsed.x} tickets`
              }
            }
          },
          scales: {
            x: { beginAtZero: true, ticks: { font: { size: 10 } } },
            y: { ticks: { font: { size: 11 } }, grid: { display: false } }
          }
        }
      });

      return canvas.toBuffer('image/png');
    } catch (error) {
      console.error('Error generando Escalation Funnel chart:', error);
      return null;
    }
  }

  /**
   * Generar gráfico: Top Agentes que Escalaron a N2
   * @param {Object} data - { topEscalators: [ { agent, count }, ... ] }
   * @returns {Buffer} PNG buffer
   */
  async generateTopEscalatorsChart(data) {
    try {
      const { topEscalators = [] } = data;
      
      if (topEscalators.length === 0) {
        console.warn('⚠️ No data for Top Escalators chart');
        return null;
      }

      // Top 10
      const top = topEscalators.slice(0, 10);
      const canvas = createCanvas(900, 400);
      const ctx = canvas.getContext('2d');

      new ChartJS.Chart(ctx, {
        type: 'bar',
        data: {
          labels: top.map(e => e.name || e.agent || 'Sin nombre'),
          datasets: [{
            label: 'Escalaciones a N2',
            data: top.map(e => e.count),
            backgroundColor: '#F97316',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: 'Top agentes que escalaron a N2',
              font: { size: 14, weight: 'bold' }
            }
          },
          scales: {
            x: { beginAtZero: true, ticks: { font: { size: 10 } } },
            y: { ticks: { font: { size: 10 } }, grid: { display: false } }
          }
        }
      });

      return canvas.toBuffer('image/png');
    } catch (error) {
      console.error('Error generando Top Escalators chart:', error);
      return null;
    }
  }

  /**
   * Generar todos los gráficos en paralelo
   * @param {Object} allChartData - Objeto con datos para todos los gráficos
   * @returns {Object} { sla, status, agent, types, incident, rfc, rfi }
   */
  async generateAllCharts(allChartData) {
    try {
      const results = await Promise.all([
        this.generateSLATrendChart(allChartData.sla),
        this.generateStatusChart(allChartData.status),
        this.generateAgentMetricsChart(allChartData.agent),
        this.generateTypeDistributionChart(allChartData.types),
        this.generateIncidentChart(allChartData.incident),
        this.generateRFCChart(allChartData.rfc),
        this.generateRFIChart(allChartData.rfi)
      ]);

      return {
        sla: results[0],
        status: results[1],
        agent: results[2],
        types: results[3],
        incident: results[4],
        rfc: results[5],
        rfi: results[6]
      };
    } catch (error) {
      console.error('Error generando todos los gráficos:', error);
      return {
        sla: null,
        status: null,
        agent: null,
        types: null,
        incident: null,
        rfc: null,
        rfi: null
      };
    }
  }

  /**
   * Conversor de buffer PNG a base64 para Excel
   * @param {Buffer} imageBuffer - Buffer PNG
   * @returns {string} Base64 con prefijo data:image
   */
  bufferToBase64(imageBuffer) {
    if (!imageBuffer) return null;
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
  }

  /**
   * Generar gráficos de Niveles (N1/N2)
   * @param {Object} levelData - Datos del servicio de niveles
   * @returns {Object} { levelAttendance, funnel, topEscalators }
   */
  async generateLevelCharts(levelData) {
    try {
      if (!levelData) {
        return { levelAttendance: null, funnel: null, topEscalators: null };
      }

      const results = await Promise.all([
        this.generateLevelAttendanceChart({
          n1Handled: levelData.byLevel?.n1?.handled || 0,
          n2Handled: levelData.byLevel?.n2?.handled || 0
        }),
        this.generateEscalationFunnelChart({
          receivedN1: levelData.escalation?.receivedN1 || 0,
          resolvedN1: levelData.escalation?.resolvedN1 || 0,
          escalatedN2: levelData.escalation?.escalatedN2 || 0
        }),
        this.generateTopEscalatorsChart({
          topEscalators: levelData.topEscalators || []
        })
      ]);

      return {
        levelAttendance: results[0],
        funnel: results[1],
        topEscalators: results[2]
      };
    } catch (error) {
      console.error('Error generando gráficos de niveles:', error);
      return { levelAttendance: null, funnel: null, topEscalators: null };
    }
  }

  /**
   * Paleta de colores por defecto
   * @private
   */
  getDefaultPalette(count) {
    const palette = [
      '#F97316',
      '#38BDF8',
      '#A855F7',
      '#34D399',
      '#F472B6',
      '#6366F1'
    ];
    return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
  }
}

module.exports = new ChartGeneratorService();
