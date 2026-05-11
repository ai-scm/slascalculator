const ExcelJS = require('exceljs');
const moment = require('moment');

class ExcelService {
  
  async generateSLAReport(tickets, metrics, filters, charts = {}) {
    const workbook = new ExcelJS.Workbook();
    
    // Metadatos del archivo
    workbook.creator = 'Service Center SLA Reporter';
    workbook.created = new Date();
    
    // Hoja 0: Niveles de Soporte (NUEVA)
    if (charts?.levelData) {
      this.createLevelsSheet(workbook, charts.levelData, charts, filters);
    }

    // Hoja 1: Resumen Ejecutivo
    this.createSummarySheet(workbook, metrics, filters);
    
    // Hoja 3: Detalle de Tickets
    this.createTicketsSheet(workbook, tickets);
    
    // Hoja 4: Métricas por Agente
    this.createAgentMetricsSheet(workbook, metrics.by_agent);
    
    // Hoja 5: Métricas por Organización/Proyecto
    this.createOrganizationMetricsSheet(workbook, metrics.by_organization);
    
    return workbook;
  }

  async generateTicketsListReport(tickets) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Service Center SLA Reporter';
    workbook.created = new Date();
    
    this.createTicketsSheet(workbook, tickets);
    
    return workbook;
  }

  createLevelsSheet(workbook, levelData, charts = {}, filters) {
    const sheet = workbook.addWorksheet('Niveles de Soporte', { views: [{ showGridLines: false, zoomScale: 85 }] });

    // ========== TÍTULO ==========
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'ANÁLISIS DE NIVELES DE SOPORTE (N1/N2)';
    titleCell.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 35;

    // ========== PERÍODO ==========
    sheet.mergeCells('A2:H2');
    const periodCell = sheet.getCell('A2');
    periodCell.value = filters.startDate && filters.endDate 
      ? `Período: ${moment(filters.startDate).format('DD/MM/YYYY')} - ${moment(filters.endDate).format('DD/MM/YYYY')}`
      : 'Todos los datos';
    periodCell.font = { size: 11, color: { argb: 'FF666666' } };
    periodCell.alignment = { horizontal: 'center' };

    // ========== MÉTRICAS EN CARDS (FILA 3) ==========
    let row = 3;
    
    const addMetricCard = (col, title, value, bgColor) => {
      sheet.mergeCells(`${String.fromCharCode(65 + col)}${row}:${String.fromCharCode(65 + col + 1)}${row}`);
      const titleCell = sheet.getCell(`${String.fromCharCode(65 + col)}${row}`);
      titleCell.value = title;
      titleCell.font = { size: 9, color: { argb: 'FF999999' }, bold: true };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      titleCell.alignment = { horizontal: 'center', vertical: 'top' };
      sheet.getRow(row).height = 20;

      const valueCell = sheet.getCell(`${String.fromCharCode(65 + col)}${row + 1}`);
      valueCell.value = value;
      valueCell.font = { size: 24, bold: true, color: { argb: 'FF1F2937' } };
      valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(row + 1).height = 35;
    };

    const bgLight = 'FFFAFAFA';
    addMetricCard(0, 'Total Tickets', levelData.totalTickets || 0, bgLight);
    addMetricCard(2, 'Atendidos N1', levelData.byLevel?.n1?.handled || 0, 'FF38BDF8');
    addMetricCard(4, 'Atendidos N2', levelData.byLevel?.n2?.handled || 0, 'FFF97316');
    
    const escalationRate = levelData.escalation?.escalationRate 
      ? `${(levelData.escalation.escalationRate * 100).toFixed(1)}%`
      : '0%';
    addMetricCard(6, 'Tasa Escalamiento', escalationRate, 'FFFBBF24');

    // ========== GRÁFICOS (FILA 5+) ==========
    row = 6;
    let currentCol = 0;

    const addChartImage = (key, col, row, width, height, label) => {
      if (charts[key]) {
        // Eliminar prefijo base64
        const base64Data = charts[key].replace(/^data:image\/\w+;base64,/, "");
        
        if (base64Data.length >= 100) {
          const imageId = workbook.addImage({
            base64: base64Data,
            extension: 'png',
          });

          // Etiqueta
          sheet.mergeCells(`${String.fromCharCode(65 + col)}${row}:${String.fromCharCode(65 + col + 3)}${row}`);
          const labelCell = sheet.getCell(`${String.fromCharCode(65 + col)}${row}`);
          labelCell.value = label;
          labelCell.font = { size: 11, bold: true, color: { argb: 'FF1F2937' } };
          labelCell.alignment = { horizontal: 'left' };

          // Imagen
          sheet.addImage(imageId, {
            tl: { col: col, row: row + 1 },
            ext: { width: width, height: height }
          });

          return true;
        }
      }
      return false;
    };

    // Gráfico 1: Atendidos por Nivel (Izquierda)
    const chart1Height = addChartImage('levelAttendance', 0, row, 500, 280, 'Tickets Atendidos por Nivel') ? 16 : 0;

    // Gráfico 2: Embudo (Centro)
    const chart2Height = addChartImage('levelFunnel', 4, row, 500, 280, 'Embudo de Escalamiento') ? 16 : 0;

    row += Math.max(chart1Height, chart2Height, 16);

    // Gráfico 3: Top Escaladores (Ancho completo)
    const chart3Height = addChartImage('levelEscalators', 0, row, 800, 300, 'Top Agentes que Escalaron a N2') ? 18 : 0;

    row += chart3Height;

    // ========== ESTADÍSTICAS DE TIEMPO (FILA FINAL) ==========
    row += 2;

    sheet.mergeCells(`A${row}:H${row}`);
    const timeTitle = sheet.getCell(`A${row}`);
    timeTitle.value = 'ESTADÍSTICAS DE TIEMPO POR NIVEL';
    timeTitle.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    timeTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
    timeTitle.alignment = { horizontal: 'left' };
    sheet.getRow(row).height = 20;

    row++;

    // Tabla de tiempos N1
    const timeHeaders = ['Métrica', 'Promedio', 'Mediana (p50)', 'P95'];
    const startRow = row;
    timeHeaders.forEach((header, idx) => {
      const cell = sheet.getCell(`${String.fromCharCode(65 + idx)}${row}`);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.getRow(row).height = 22;

    row++;

    // N1 row
    sheet.getCell(`A${row}`).value = 'Nivel 1';
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = levelData.timeStats?.n1?.avgHours ? `${levelData.timeStats.n1.avgHours.toFixed(1)} h` : 'N/A';
    sheet.getCell(`C${row}`).value = levelData.timeStats?.n1?.medianHours ? `${levelData.timeStats.n1.medianHours.toFixed(1)} h` : 'N/A';
    sheet.getCell(`D${row}`).value = levelData.timeStats?.n1?.p95Hours ? `${levelData.timeStats.n1.p95Hours.toFixed(1)} h` : 'N/A';
    sheet.getRow(row).height = 20;

    // Centrar valores
    for (let i = 1; i < 4; i++) {
      sheet.getCell(`${String.fromCharCode(65 + i)}${row}`).alignment = { horizontal: 'center' };
    }

    row++;

    // N2 row
    sheet.getCell(`A${row}`).value = 'Nivel 2';
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = levelData.timeStats?.n2?.avgHours ? `${levelData.timeStats.n2.avgHours.toFixed(1)} h` : 'N/A';
    sheet.getCell(`C${row}`).value = levelData.timeStats?.n2?.medianHours ? `${levelData.timeStats.n2.medianHours.toFixed(1)} h` : 'N/A';
    sheet.getCell(`D${row}`).value = levelData.timeStats?.n2?.p95Hours ? `${levelData.timeStats.n2.p95Hours.toFixed(1)} h` : 'N/A';
    sheet.getRow(row).height = 20;

    // Centrar valores
    for (let i = 1; i < 4; i++) {
      sheet.getCell(`${String.fromCharCode(65 + i)}${row}`).alignment = { horizontal: 'center' };
    }

    // Colores para filas alternadas
    for (let rowIdx = startRow + 1; rowIdx <= row; rowIdx++) {
      const bgColor = (rowIdx - startRow - 1) % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';
      for (let colIdx = 0; colIdx < 4; colIdx++) {
        sheet.getCell(`${String.fromCharCode(65 + colIdx)}${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      }
    }

    // Anchos de columna
    sheet.columns = [
      { width: 18 },
      { width: 16 },
      { width: 18 },
      { width: 16 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 }
    ];
  }

  createSummarySheet(workbook, metrics, filters) {
    const sheet = workbook.addWorksheet('Resumen Ejecutivo');
    
    // Configurar anchos de columnas
    sheet.columns = [
      { width: 30 },
      { width: 20 },
      { width: 15 }
    ];
    
    // Título
    sheet.mergeCells('A1:C1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'REPORTE DE SLA - SERVICE CENTER';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 30;
    
    // Información de filtros
    let row = 3;
    sheet.getCell(`A${row}`).value = 'Período del Reporte:';
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = filters.startDate && filters.endDate 
      ? `${moment(filters.startDate).format('DD/MM/YYYY')} - ${moment(filters.endDate).format('DD/MM/YYYY')}`
      : 'Todos los tickets';
    
    row += 2;
    
    // Métricas generales
    sheet.getCell(`A${row}`).value = 'MÉTRICAS GENERALES';
    sheet.getCell(`A${row}`).font = { size: 12, bold: true, color: { argb: 'FF0066CC' } };
    row++;
    
    const generalMetrics = [
      ['Total de Tickets', metrics.total_tickets],
      ['Tickets Cerrados', metrics.closed_tickets],
      ['Tickets Abiertos', metrics.open_tickets]
    ];
    
    generalMetrics.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      sheet.getCell(`B${row}`).numFmt = '#,##0';
      row++;
    });
    
    row += 2;
    
    // Métricas de Primera Respuesta
    sheet.getCell(`A${row}`).value = 'PRIMERA RESPUESTA - SLA';
    sheet.getCell(`A${row}`).font = { size: 12, bold: true, color: { argb: 'FF0066CC' } };
    row++;
    
    const firstResponseMetrics = [
      ['Total con SLA definido', metrics.first_response.total_with_sla],
      ['SLA Cumplido', metrics.first_response.met],
      ['SLA Incumplido', metrics.first_response.breached],
      ['Tasa de Cumplimiento', `${metrics.first_response.compliance_rate}%`],
      ['Tiempo Promedio (minutos)', parseFloat(metrics.first_response.avg_time_minutes)]
    ];
    
    firstResponseMetrics.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      if (typeof value === 'number') {
        sheet.getCell(`B${row}`).numFmt = '#,##0.00';
      }
      
      // Colorear cumplido/incumplido
      if (label === 'SLA Cumplido') {
        sheet.getCell(`B${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }
        };
      } else if (label === 'SLA Incumplido') {
        sheet.getCell(`B${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF6B6B' }
        };
      }
      row++;
    });
    
    row += 2;
    
    // Métricas de Resolución
    sheet.getCell(`A${row}`).value = 'RESOLUCIÓN - SLA';
    sheet.getCell(`A${row}`).font = { size: 12, bold: true, color: { argb: 'FF0066CC' } };
    row++;
    
    const resolutionMetrics = [
      ['Total con SLA definido', metrics.resolution.total_with_sla],
      ['SLA Cumplido', metrics.resolution.met],
      ['SLA Incumplido', metrics.resolution.breached],
      ['Tasa de Cumplimiento', `${metrics.resolution.compliance_rate}%`],
      ['Tiempo Promedio (minutos)', parseFloat(metrics.resolution.avg_time_minutes)]
    ];
    
    resolutionMetrics.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`B${row}`).value = value;
      if (typeof value === 'number') {
        sheet.getCell(`B${row}`).numFmt = '#,##0.00';
      }
      
      // Colorear cumplido/incumplido
      if (label === 'SLA Cumplido') {
        sheet.getCell(`B${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }
        };
      } else if (label === 'SLA Incumplido') {
        sheet.getCell(`B${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF6B6B' }
        };
      }
      row++;
    });
  }
  createTicketsSheet(workbook, tickets) {
    const sheet = workbook.addWorksheet('Detalle Completo');
    
    // Encabezados según requerimiento
    const headers = [
      'Número',
      'Creado en',
      'Tipo de Solicitud',
      'Estado',
      'Empresa',
      'Proyecto',
      'Título',
      'Prioridad',
      'Solicitante',
      'Asignado a',
      'Última Modificación',
      'Fase',
      'Responsable',
      'Tiempo Hightech',
      'Tiempo Cliente',
      'SLA 1ra Resp.',
      'SLA Resolución'
    ];
    
    sheet.addRow(headers);
    
    // Estilo de encabezados
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 30;
    
    // Ancho de columnas
    sheet.columns = [
      { width: 12 },  // Número
      { width: 18 },  // Creado en
      { width: 16 },  // Tipo
      { width: 14 },  // Estado
      { width: 20 },  // Empresa
      { width: 25 },  // Proyecto
      { width: 30 },  // Título
      { width: 10 },  // Prioridad
      { width: 18 },  // Solicitante
      { width: 18 },  // Asignado a
      { width: 18 },  // Última Modificación
      { width: 10 },  // Fase
      { width: 18 },  // Responsable
      { width: 14 },  // Tiempo Hightech
      { width: 14 },  // Tiempo Cliente
      { width: 15 },  // SLA 1ra Resp.
      { width: 15 }   // SLA Resolución
    ];
    
    // Datos
    tickets.forEach(ticket => {
      const firstResponseSLA = ticket.first_response_sla_met === true ? 'CUMPLIDO' : (ticket.first_response_sla_met === false ? 'INCUMPLIDO' : '-');
      const resolutionSLA = ticket.resolution_sla_met === true ? 'CUMPLIDO' : (ticket.resolution_sla_met === false ? 'INCUMPLIDO' : '-');

      const row = sheet.addRow([
        ticket.ticket_number,
        ticket.created_at ? moment(ticket.created_at).utcOffset(-5).format('DD/MM/YYYY HH:mm') : '',
        ticket.type || '',
        ticket.state_name,
        ticket.empresa || '',
        ticket.organization_name,
        ticket.title,
        ticket.priority_name,
        ticket.customer_name || '',
        ticket.owner_name || '',
        ticket.updated_at ? moment(ticket.updated_at).utcOffset(-5).format('DD/MM/YYYY HH:mm') : '',
        ticket.bld_ticket_fase || '',
        ticket.bld_responsable || '',
        ticket.hightech_time_formatted || '0m',
        ticket.client_time_formatted || '0m',
        firstResponseSLA,
        resolutionSLA
      ]);
      
      // Alineación y formato
      row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      // Colorear celdas de SLA para facilitar lectura
      const frCell = row.getCell(16);
      if (firstResponseSLA === 'CUMPLIDO') frCell.font = { color: { argb: 'FF008000' }, bold: true }; // Verde
      if (firstResponseSLA === 'INCUMPLIDO') frCell.font = { color: { argb: 'FFFF0000' }, bold: true }; // Rojo

      const resCell = row.getCell(17);
      if (resolutionSLA === 'CUMPLIDO') resCell.font = { color: { argb: 'FF008000' }, bold: true }; // Verde
      if (resolutionSLA === 'INCUMPLIDO') resCell.font = { color: { argb: 'FFFF0000' }, bold: true }; // Rojo
    });
    
    // Filtros automáticos
    sheet.autoFilter = {
      from: 'A1',
      to: 'Q1'
    };
  }

  createAgentMetricsSheet(workbook, agentMetrics) {
    const sheet = workbook.addWorksheet('Métricas por Agente');
    
    // Encabezados
    const headers = [
      'Agente',
      'Total Tickets',
      'Tickets Cerrados',
      '1ra Resp. Cumplido',
      '1ra Resp. Incumplido',
      'Resolución Cumplido',
      'Resolución Incumplido',
      '% Cumplimiento 1ra Resp.',
      '% Cumplimiento Resolución'
    ];
    
    sheet.addRow(headers);
    
    // Estilo de encabezados
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;
    
    // Datos
    Object.entries(agentMetrics).forEach(([agent, metrics]) => {
      const firstResponseTotal = metrics.first_response_met + metrics.first_response_breached;
      const resolutionTotal = metrics.resolution_met + metrics.resolution_breached;
      
      const firstResponseRate = firstResponseTotal > 0 
        ? ((metrics.first_response_met / firstResponseTotal) * 100).toFixed(2)
        : 0;
      
      const resolutionRate = resolutionTotal > 0
        ? ((metrics.resolution_met / resolutionTotal) * 100).toFixed(2)
        : 0;
      
      sheet.addRow([
        agent,
        metrics.total,
        metrics.closed,
        metrics.first_response_met,
        metrics.first_response_breached,
        metrics.resolution_met,
        metrics.resolution_breached,
        `${firstResponseRate}%`,
        `${resolutionRate}%`
      ]);
    });
    
    // Ajustar anchos
    sheet.columns.forEach(column => {
      column.width = 20;
    });
    
    // Filtros automáticos
    sheet.autoFilter = {
      from: 'A1',
      to: 'I1'
    };
  }

  createOrganizationMetricsSheet(workbook, organizationMetrics) {
    const sheet = workbook.addWorksheet('Métricas por Organización');
    
    // Encabezados
    const headers = [
      'Organización/Proyecto',
      'Total Tickets',
      'Tickets Cerrados',
      '1ra Resp. Cumplido',
      '1ra Resp. Incumplido',
      'Resolución Cumplido',
      'Resolución Incumplido',
      '% Cumplimiento 1ra Resp.',
      '% Cumplimiento Resolución'
    ];
    
    sheet.addRow(headers);
    
    // Estilo de encabezados
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;
    
    // Datos
    Object.entries(organizationMetrics).forEach(([org, metrics]) => {
      const firstResponseTotal = metrics.first_response_met + metrics.first_response_breached;
      const resolutionTotal = metrics.resolution_met + metrics.resolution_breached;
      
      const firstResponseRate = firstResponseTotal > 0 
        ? ((metrics.first_response_met / firstResponseTotal) * 100).toFixed(2)
        : 0;
      
      const resolutionRate = resolutionTotal > 0
        ? ((metrics.resolution_met / resolutionTotal) * 100).toFixed(2)
        : 0;
      
      sheet.addRow([
        org,
        metrics.total,
        metrics.closed,
        metrics.first_response_met,
        metrics.first_response_breached,
        metrics.resolution_met,
        metrics.resolution_breached,
        `${firstResponseRate}%`,
        `${resolutionRate}%`
      ]);
    });
    
    // Ajustar anchos
    sheet.columns.forEach(column => {
      column.width = 20;
    });
    
    // Filtros automáticos
    sheet.autoFilter = {
      from: 'A1',
      to: 'I1'
    };
  }
}

module.exports = new ExcelService();
