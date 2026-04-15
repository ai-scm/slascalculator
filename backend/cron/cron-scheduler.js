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
  
  cron.schedule('*/10 * * * *', async () => {
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
  console.log('✓ CRON programado: Exportacion SLA cada 30 minutos');
  console.log('✓ Zona horaria: America/Bogota\n');
}

module.exports = { initializeCronJobs };
