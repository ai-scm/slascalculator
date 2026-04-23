const holidayService = require('./services/HolidayService');

(async () => {
  console.log('=== 📅 PRUEBA DE ACTUALIZACIÓN CONTROLADA DE FALLBACK ===\n');

  const year = 2026;
  const outsideUpdateDate = new Date('2026-02-15');
  const firstUpdateDate = new Date('2026-01-15');
  const repeatUpdateDate = new Date('2026-01-15');
  const otherDate = new Date('2026-09-16');

  console.log('1️⃣ FUERA DE VENTANA DE ACTUALIZACIÓN (NO debe consumir API):');
  const fallbackBefore = await holidayService.getColombianHolidays(year, outsideUpdateDate);
  const statusBefore = holidayService.getFallbackStatus(year);
  console.log(`   Fecha: ${outsideUpdateDate.toISOString().slice(0, 10)}`);
  console.log(`   Fallback usado: ${statusBefore.source}`);
  console.log(`   Festivos: ${fallbackBefore.size}`);
  console.log(`   Status:`, statusBefore, '\n');

  console.log('2️⃣ EN FECHA DE ACTUALIZACIÓN PERMITIDA (debe intentar API):');
  const apiHolidays = await holidayService.getColombianHolidays(year, firstUpdateDate);
  const statusAfter = holidayService.getFallbackStatus(year);
  console.log(`   Fecha: ${firstUpdateDate.toISOString().slice(0, 10)}`);
  console.log(`   Resultado API: ${apiHolidays.size} festivos`);
  console.log(`   Fallback actual: ${statusAfter.source}`);
  console.log(`   Status:`, statusAfter, '\n');

  console.log('3️⃣ REPETIR MISMA FECHA DE ACTUALIZACIÓN (no debe contar como nueva actualización):');
  const apiHolidaysRepeat = await holidayService.getColombianHolidays(year, repeatUpdateDate);
  const statusRepeat = holidayService.getFallbackStatus(year);
  console.log(`   Fecha: ${repeatUpdateDate.toISOString().slice(0, 10)}`);
  console.log(`   Resultado repetido: ${apiHolidaysRepeat.size} festivos`);
  console.log(`   Status:`, statusRepeat, '\n');

  console.log('4️⃣ OTRA FECHA FUERA DE VENTANA (debe usar fallback sin consumir API):');
  const fallbackAfter = await holidayService.getColombianHolidays(year, otherDate);
  const statusFinal = holidayService.getFallbackStatus(year);
  console.log(`   Fecha: ${otherDate.toISOString().slice(0, 10)}`);
  console.log(`   Fallback usado: ${statusFinal.source}`);
  console.log(`   Festivos: ${fallbackAfter.size}`);
  console.log(`   Status:`, statusFinal, '\n');

  console.log('5️⃣ VALIDACIÓN DE FUNCIONALIDAD:');
  console.log(`   isHoliday('2026-07-20'): ${await holidayService.isHoliday('2026-07-20')}`);
  console.log(`   isHoliday('2026-07-21'): ${await holidayService.isHoliday('2026-07-21')}`);
})();