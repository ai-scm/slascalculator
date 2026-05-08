const cron = require('node-cron');
const { exportSLAToQuickSight } = require('./sla-exporter-cron');
const logger = require('../utils/logger');

/**
 * Registrar todos los CRON jobs
 * Se ejecuta al iniciar el servidor
 */
function initializeCronJobs() {
  console.log('\n🔧 Inicializando CRON jobs...\n');

  // Ejecutar inmediatamente al iniciar
  console.log('⏰ Ejecutando exportación inicial...');
  exportSLAToQuickSight().catch(err => {
    console.error('❌ Error en exportación inicial:', err.message);
  });

  // CRON 6 veces al día de Lunes a Sábado (06:00 - 22:00) Colombia
  // Sincronizado con Glue Crawler que se dispara automáticamente después de cada exportación
  const horarios = [
    { expr: '0 6 * * 1-6',  label: '06:00' },
    { expr: '0 9 * * 1-6',  label: '09:00' },
    { expr: '0 12 * * 1-6', label: '12:00' },
    { expr: '0 15 * * 1-6', label: '15:00' },
    { expr: '0 18 * * 1-6', label: '18:00' },
    { expr: '0 22 * * 1-6', label: '22:00' },
  ];

  horarios.forEach(({ expr, label }) => {
    cron.schedule(expr, async () => {
      console.log(`⏰ CRON TRIGGER [${label}]: Hora de exportar SLA`);
      try {
        await exportSLAToQuickSight();
      } catch (error) {
        console.error('❌ Error en CRON:', error.message);
        logger.error('Error en CRON', error);
      }
    }, {
      timezone: 'America/Bogota'
    });
  });

  console.log('✓ CRON programado: 6 ejecuciones diarias (06:00 | 09:00 | 12:00 | 15:00 | 18:00 | 22:00)');
  console.log('✓ Días activos: Lunes a Sábado (sin domingos)');
  console.log('✓ Zona horaria: America/Bogota\n');
}

module.exports = { initializeCronJobs };
