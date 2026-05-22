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

  // CRON cada hora de Lunes a Sábado (06:00 - 22:00) Colombia
  // Sincronizado con Glue Crawler que se dispara automáticamente después de cada exportación
  cron.schedule('0 6-22 * * 1-6', async () => {
    const now = new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' });
    console.log(`⏰ CRON TRIGGER [${now}]: Hora de exportar SLA`);
    try {
      await exportSLAToQuickSight();
    } catch (error) {
      console.error('❌ Error en CRON:', error.message);
      logger.error('Error en CRON', error);
    }
  }, {
    timezone: 'America/Bogota'
  });

  console.log('✓ CRON programado: cada hora entre 06:00 y 22:00 (17 ejecuciones diarias)');
  console.log('✓ Días activos: Lunes a Sábado (sin domingos)');
  console.log('✓ Zona horaria: America/Bogota\n');
}

module.exports = { initializeCronJobs };
