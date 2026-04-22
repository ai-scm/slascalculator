const holidayService = require('./services/HolidayService');

(async () => {
  console.log('=== 📅 PRUEBA DE OPCIÓN 2: FALLBACK DINÁMICO ===\n');

  const year = 2026;

  // PASO 1: Fallback antes de consultar API (estará vacío, así que es estático)
  console.log('1️⃣ ANTES de consultar API:');
  const fallbackBefore = holidayService.getFallbackHolidays(year);
  console.log(`   📌 Fallback inicial: ${fallbackBefore.size} festivos`);
  console.log(`   Fuente: ${fallbackBefore.size === 6 ? 'ESTÁTICO (hardcodeado)' : 'DINÁMICO (de API previa)'}\n`);

  // PASO 2: Consultar API explícitamente
  console.log('2️⃣ Consultando API para cargar el fallback dinámico:');
  const apiHolidays = await holidayService.getColombianHolidays(year);
  console.log(`   🌐 Datos de API: ${apiHolidays.size} festivos (Año Nuevo: ${apiHolidays.has(`${year}-01-01`)}, Jul 20: ${apiHolidays.has(`${year}-07-20`)})\n`);

  // PASO 3: Verificar que el fallback se ha actualizado
  console.log('3️⃣ DESPUÉS de consultar API exitosamente:');
  const fallbackAfter = holidayService.getFallbackHolidays(year);
  console.log(`   📌 Fallback actualizado: ${fallbackAfter.size} festivos`);
  console.log(`   Fuente: ${fallbackAfter.size > 6 ? 'DINÁMICO (de API)' : 'ESTÁTICO (hardcodeado)'}\n`);

  // PASO 4: Comparación
  console.log('4️⃣ COMPARACIÓN ANTES vs DESPUÉS:');
  if (fallbackBefore.size === fallbackAfter.size) {
    console.log(`   ⚠️  FALLBACK NO CAMBIÓ: ${fallbackBefore.size} = ${fallbackAfter.size}`);
  } else {
    console.log(`   ✅ FALLBACK SÍ SE ACTUALIZÓ: ${fallbackBefore.size} → ${fallbackAfter.size}`);
    console.log(`   📈 Festivos adicionales capturados: +${fallbackAfter.size - fallbackBefore.size}`);
    const newOnes = Array.from(fallbackAfter).filter(f => !fallbackBefore.has(f));
    console.log(`   🆕 Nuevas fechas en fallback: ${newOnes.sort().join(', ')}\n`);
  }

  // PASO 5: Demostración del beneficio
  console.log('5️⃣ BENEFICIO DE OPCIÓN 2:');
  if (fallbackAfter.size > fallbackBefore.size) {
    console.log(`   ✨ Si la API falla ahora, el fallback tendrá ${fallbackAfter.size} festivos en lugar de ${fallbackBefore.size}`);
    console.log(`   📊 Precisión mejorada: ${((fallbackAfter.size - fallbackBefore.size) / fallbackBefore.size * 100).toFixed(0)}% más completo`);
  } else {
    console.log(`   ℹ️  La API falló, así que usa fallback estático`);
  }

  console.log('\n6️⃣ PRUEBAS FUNCIONALES:');
  console.log(`   Probando: isHoliday('2026-07-20') = ${await holidayService.isHoliday(`${year}-07-20`)} ✓`);
})();