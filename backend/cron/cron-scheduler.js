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
  
  // CRON diario a las 8:00 AM Colombia
  // Sincronizado con Glue Crawler que se dispara automáticamente después de cada exportación
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ CRON TRIGGER: Hora de exportar SLA');
    try {
      await exportSLAToQuickSight();
    } catch (error) {
      console.error('❌ Error en CRON:', error.message);
      logger.error('Error en CRON', error);
    }
  }, {
    timezone: 'America/Bogota'
  });
  console.log('✓ CRON programado: Exportacion SLA diaria a las 8:00 AM (Colombia)');
  console.log('✓ Zona horaria: America/Bogota\n');
}

module.exports = { initializeCronJobs };
