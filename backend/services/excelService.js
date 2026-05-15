const ExcelJS = require('exceljs');
const moment = require('moment');

class ExcelService {
  
  async generateSLAReport(tickets, metrics, filters, charts = {}) {
    const workbook = new ExcelJS.Workbook();
    
    // Metadatos del archivo
    workbook.creator = 'Service Center SLA Reporter';
    workbook.created = new Date();
    
    // Hoja 1: Resumen Ejecutivo
    this.createSummarySheet(workbook, metrics, filters);
    
    // Hoja 2: Detalle de Tickets
    this.createTicketsSheet(workbook, tickets);
    
    // Hoja 3: Métricas por Agente
    this.createAgentMetricsSheet(workbook, metrics.by_agent);
    
    // Hoja 4: Métricas por Organización/Proyecto
    this.createOrganizationMetricsSheet(workbook, metrics.by_organization);

    // Hoja 5: Niveles de Soporte (última)
    if (charts?.levelData) {
      this.createLevelsSheet(workbook, charts.levelData, charts, filters);
    }
    
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
    const sheet = workbook.addWorksheet('Niveles de Soporte', { views: [{ showGridLines: true, zoomScale: 100 }] });

    // Anchos de columna
    sheet.columns = [
      { width: 28 },  // A — Métrica / Etapa / Nivel / #
      { width: 22 },  // B — Valor / Tickets / Promedio / Organización
      { width: 22 },  // C — Mediana P50 / Tickets en N2
      { width: 22 },  // D — P95
    ];

    let row = 1;

    // ── TÍTULO ──────────────────────────────────────────────
    sheet.mergeCells(`A${row}:D${row}`);
    const titleCell = sheet.getCell(`A${row}`);
    titleCell.value = 'REPORTE DE NIVELES DE SOPORTE';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(row).height = 30;
    row++;

    // ── FILA VACÍA ───────────────────────────────────────────
    row++;

    // ── PERÍODO ──────────────────────────────────────────────
    sheet.getCell(`A${row}`).value = 'Período del Reporte:';
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`B${row}`).value = filters?.startDate && filters?.endDate
      ? `${moment(filters.startDate).format('DD/MM/YYYY')} - ${moment(filters.endDate).format('DD/MM/YYYY')}`
      : 'Todos los datos';
    row++;

    // ── FILA VACÍA ───────────────────────────────────────────
    row++;

    // ── SECCIÓN 1: KPIs GENERALES ────────────────────────────
    // Título de sección — texto azul, sin fondo
    sheet.getCell(`A${row}`).value = 'KPIs GENERALES';
    sheet.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF0066CC' }, size: 12 };
    row++;

    // Cabecera tabla
    ['A', 'B'].forEach((col, idx) => {
      const cell = sheet.getCell(`${col}${row}`);
      cell.value = ['Métrica', 'Valor'][idx];
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.getRow(row).height = 20;
    row++;

    const escalationRate = levelData.escalation?.escalationRate != null
      ? `${(levelData.escalation.escalationRate * 100).toFixed(1)}%`
      : '0%';

    const kpis = [
      ['Total Tickets',        levelData.totalTickets || 0],
      ['Atendidos N1',         levelData.byLevel?.n1?.handled || 0],
      ['Atendidos N2',         levelData.byLevel?.n2?.handled || 0],
      ['Agentes N1',           levelData.byLevel?.n1?.members || 0],
      ['Agentes N2',           levelData.byLevel?.n2?.members || 0],
      ['Tasa de Escalamiento', escalationRate],
    ];

    kpis.forEach(([label, value], idx) => {
      const bg = idx % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';
      const aCell = sheet.getCell(`A${row}`);
      aCell.value = label;
      aCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      aCell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };

      const bCell = sheet.getCell(`B${row}`);
      bCell.value = value;
      bCell.alignment = { horizontal: 'right' };
      bCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      bCell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      row++;
    });

    // ── FILA VACÍA ───────────────────────────────────────────
    row++;

    // ── SECCIÓN 2: EMBUDO DE ESCALAMIENTO ────────────────────
    sheet.getCell(`A${row}`).value = 'EMBUDO DE ESCALAMIENTO';
    sheet.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF0066CC' }, size: 12 };
    row++;

    ['A', 'B'].forEach((col, idx) => {
      const cell = sheet.getCell(`${col}${row}`);
      cell.value = ['Etapa', 'Tickets'][idx];
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.getRow(row).height = 20;
    row++;

    const embudo = [
      ['Recibidos en N1', levelData.escalation?.receivedN1 || 0],
      ['Resueltos en N1',  levelData.escalation?.resolvedN1  || 0],
      ['Escalados a N2',   levelData.escalation?.escalatedN2 || 0],
    ];

    embudo.forEach(([label, value], idx) => {
      const bg = idx % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';
      const aCell = sheet.getCell(`A${row}`);
      aCell.value = label;
      aCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      aCell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };

      const bCell = sheet.getCell(`B${row}`);
      bCell.value = value;
      bCell.alignment = { horizontal: 'right' };
      bCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      bCell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      row++;
    });

    // ── FILA VACÍA ───────────────────────────────────────────
    row++;

    // ── SECCIÓN 3: TIEMPOS POR NIVEL ─────────────────────────
    sheet.getCell(`A${row}`).value = 'TIEMPOS POR NIVEL (horas)';
    sheet.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF0066CC' }, size: 12 };
    row++;

    [['A', 'Nivel'], ['B', 'Promedio (h)'], ['C', 'Mediana P50 (h)'], ['D', 'P95 (h)']].forEach(([col, label]) => {
      const cell = sheet.getCell(`${col}${row}`);
      cell.value = label;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.getRow(row).height = 20;
    row++;

    [
      ['Nivel 1', levelData.timeStats?.n1],
      ['Nivel 2', levelData.timeStats?.n2],
    ].forEach(([label, stats], idx) => {
      const bg = idx % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';

      ['A', 'B', 'C', 'D'].forEach(col => {
        sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        sheet.getCell(`${col}${row}`).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      });

      sheet.getCell(`A${row}`).value = label;

      const avg = stats?.avgHours != null ? +stats.avgHours.toFixed(2) : null;
      const med = stats?.medianHours != null ? +stats.medianHours.toFixed(2) : null;
      const p95 = stats?.p95Hours != null ? +stats.p95Hours.toFixed(2) : null;

      sheet.getCell(`B${row}`).value = avg ?? 'N/A';
      sheet.getCell(`C${row}`).value = med ?? 'N/A';
      sheet.getCell(`D${row}`).value = p95 ?? 'N/A';

      ['B', 'C', 'D'].forEach(col => {
        const cell = sheet.getCell(`${col}${row}`);
        cell.alignment = { horizontal: 'right' };
        if (typeof cell.value === 'number') cell.numFmt = '#,##0.00';
      });

      row++;
    });

    // ── FILA VACÍA ───────────────────────────────────────────
    row++;

    // ── SECCIÓN 4: TOP ORGANIZACIONES EN N2 ──────────────────
    // Lista completa sin límite (a diferencia del frontend que pagina)
    const orgsN2 = levelData.topOrganizationsN2 || [];
    if (orgsN2.length > 0) {
      sheet.getCell(`A${row}`).value = 'TOP ORGANIZACIONES EN N2';
      sheet.getCell(`A${row}`).font = { bold: true, color: { argb: 'FF0066CC' }, size: 12 };
      row++;

      [['A', '#'], ['B', 'Organización'], ['C', 'Tickets en N2']].forEach(([col, label]) => {
        const cell = sheet.getCell(`${col}${row}`);
        cell.value = label;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
        cell.alignment = { horizontal: col === 'B' ? 'left' : 'center', vertical: 'middle' };
      });
      sheet.getRow(row).height = 20;
      row++;

      orgsN2.forEach((org, idx) => {
        const bg = idx % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF';

        sheet.getCell(`A${row}`).value = idx + 1;
        sheet.getCell(`A${row}`).alignment = { horizontal: 'center' };

        sheet.getCell(`B${row}`).value = org.organizationName;

        sheet.getCell(`C${row}`).value = org.ticketCount;
        sheet.getCell(`C${row}`).numFmt = '#,##0';
        sheet.getCell(`C${row}`).alignment = { horizontal: 'right' };

        ['A', 'B', 'C'].forEach(col => {
          sheet.getCell(`${col}${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          sheet.getCell(`${col}${row}`).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
        });

        row++;
      });
    }
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
