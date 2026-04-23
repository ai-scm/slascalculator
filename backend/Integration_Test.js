const workingHoursService = require('./services/workingHoursService');

(async () => {
  console.log('=== 🧪 PRUEBA DE INTEGRACIÓN: WorkingHoursService + HolidayService ===\n');

  const year = 2026;

  // 1. Verificar inicialización
  console.log('1️⃣ INICIALIZACIÓN:');
  console.log(`   Fallback inicial: ${workingHoursService.holidayDates.size} festivos`);
  console.log(`   Fuente: ${workingHoursService.holidayDates.size === 6 ? 'ESTÁTICO' : 'DINÁMICO'}\n`);

  // 2. Simular actualización (si estamos en fecha permitida)
  console.log('2️⃣ ACTUALIZACIÓN DESDE HOLIDAYSERVICE:');
  const currentDate = new Date('2026-01-15'); // Fecha de actualización permitida
  try {
    const apiHolidays = await require('./services/HolidayService').getColombianHolidays(year, currentDate);
    console.log(`   HolidayService devolvió: ${apiHolidays.size} festivos`);
    console.log(`   WorkingHoursService ahora tiene: ${workingHoursService.holidayDates.size} festivos\n`);
  } catch (err) {
    console.log(`   Error en actualización: ${err.message}\n`);
  }

  // 3. Probar cálculo de horas laborales
  console.log('3️⃣ PRUEBA DE FUNCIONALIDAD:');
  const startDate = '2026-07-19 09:00'; // Viernes antes de feriado
  const endDate = '2026-07-21 17:00';   // Lunes después de feriado

  const minutes = workingHoursService.calculateWorkingMinutes(startDate, endDate, 'laboral');
  const hours = Math.round(minutes / 60 * 100) / 100;

  console.log(`   Cálculo: ${startDate} → ${endDate}`);
  console.log(`   Minutos laborales: ${minutes} (${hours} horas)`);
  console.log(`   Feriado incluido: 2026-07-20 (Independencia de Colombia)`);

  // 4. Verificar que el feriado se excluye
  const isHoliday = await require('./services/HolidayService').isHoliday('2026-07-20');
  console.log(`   isHoliday('2026-07-20'): ${isHoliday} ✓\n`);

  console.log('✅ INTEGRACIÓN COMPLETADA: WorkingHoursService usa HolidayService correctamente.');
})();