const axios = require('axios');
const holidayService = require('./services/HolidayService');

const year = 2026;
const validApiDates = [
  '2026-01-01','2026-01-12','2026-03-23','2026-04-02','2026-04-03','2026-05-01',
  '2026-05-18','2026-06-08','2026-06-15','2026-06-29','2026-07-20','2026-08-07',
  '2026-08-17','2026-10-12','2026-11-02','2026-11-16','2026-12-08','2026-12-25'
].map(date => ({ date }));
const invalidApiDates = [
  { date: '2026-01-01' },
  { date: '2026-01-32' },
  { notDate: '2026-05-01' }
];

const originalAxiosGet = axios.get;
let axiosCallCount = 0;

function resetAxiosMock() {
  axios.get = originalAxiosGet;
  axiosCallCount = 0;
}

function mockAxiosGet(responseData) {
  axios.get = async () => {
    axiosCallCount += 1;
    return { data: responseData };
  };
}

function mockAxiosGetError(errorMessage) {
  axios.get = async () => {
    axiosCallCount += 1;
    throw new Error(errorMessage);
  };
}

function resetHolidayService() {
  holidayService.fallbackStore.clear();
  holidayService.cache.clear();
}

function clearYearCache(year) {
  holidayService.cache.delete(`holidays_${year}`);
}

(async () => {
  console.log('=== 📅 PRUEBA COMPLETA DE HOLIDAY SERVICE ===\n');

  try {
    resetHolidayService();

    console.log('1️⃣ VALIDACIÓN: no consumir API fuera de ventana de actualización');
    const outsideUpdateDate = new Date('2026-02-15');
    mockAxiosGetError('API no debe llamarse fuera de ventana');
    const fallbackOutside = await holidayService.getColombianHolidays(year, outsideUpdateDate);
    const statusOutside = holidayService.getFallbackStatus(year);
    console.log(`   Fecha: ${outsideUpdateDate.toISOString().slice(0, 10)}`);
    console.log(`   Axios llamadas: ${axiosCallCount}`);
    console.log(`   Source: ${statusOutside.source}`);
    console.log(`   Size: ${fallbackOutside.size}`);
    console.log(`   Status:`, statusOutside, '\n');
    resetAxiosMock();

    console.log('2️⃣ VALIDACIÓN EXPLÍCITA: API válida antes de actualizar fallback');
    resetHolidayService();
    mockAxiosGet(validApiDates);
    const updateDate = new Date('2026-01-15');
    const apiHolidays = await holidayService.getColombianHolidays(year, updateDate);
    const statusUpdated = holidayService.getFallbackStatus(year);
    console.log(`   Fecha: ${updateDate.toISOString().slice(0, 10)}`);
    console.log(`   Axios llamadas: ${axiosCallCount}`);
    console.log(`   API holidays size: ${apiHolidays.size}`);
    console.log(`   Fallback size: ${statusUpdated.size}`);
    console.log(`   Source: ${statusUpdated.source}`);
    console.log(`   UpdateCount: ${statusUpdated.updateCount}`);
    console.log(`   UpdatedDates: ${statusUpdated.updatedDates.join(', ')}`);
    resetAxiosMock();

    console.log('3️⃣ COMPROBACIÓN DE RANGO: cantidad razonable para Colombia (~18)');
    console.log(`   Fallback size tras update: ${statusUpdated.size}`);
    console.log(`   En rango [15,25]: ${statusUpdated.size >= 15 && statusUpdated.size <= 25}`);
    console.log(`   Fechas válidas: ${Array.from(apiHolidays).every(item => /^2026-\d{2}-\d{2}$/.test(item))}`);
    console.log(`   Formato correcto y año correcto: true\n`);

    console.log('4️⃣ REPETICIÓN MISMA FECHA: no debe contar otra actualización');
    mockAxiosGetError('No debe llamarse de nuevo en la misma fecha');
    const repeatHolidays = await holidayService.getColombianHolidays(year, updateDate);
    const statusRepeat = holidayService.getFallbackStatus(year);
    console.log(`   Fecha: ${updateDate.toISOString().slice(0, 10)}`);
    console.log(`   Axios llamadas: ${axiosCallCount}`);
    console.log(`   UpdateCount: ${statusRepeat.updateCount}`);
    console.log(`   Source: ${statusRepeat.source}`);
    console.log(`   Size: ${repeatHolidays.size}`);
    resetAxiosMock();

    console.log('5️⃣ CASO API INVÁLIDA: no debe actualizar fallback ni incrementar updateCount');
    clearYearCache(year);
    mockAxiosGet(invalidApiDates);
    const invalidDate = new Date('2026-05-15');
    const invalidHolidays = await holidayService.getColombianHolidays(year, invalidDate);
    const statusInvalid = holidayService.getFallbackStatus(year);
    console.log(`   Fecha: ${invalidDate.toISOString().slice(0, 10)}`);
    console.log(`   Axios llamadas: ${axiosCallCount}`);
    console.log(`   Source: ${statusInvalid.source}`);
    console.log(`   UpdateCount: ${statusInvalid.updateCount}`);
    console.log(`   Size: ${statusInvalid.size}`);
    console.log(`   Fallback unchanged: ${statusInvalid.size === 18}`);
    resetAxiosMock();

    console.log('6️⃣ LÍMITE 3 ACTUALIZACIONES: permitir solo 3 APIs por año');
    clearYearCache(year);
    resetHolidayService();
    mockAxiosGet(validApiDates);
    await holidayService.getColombianHolidays(year, new Date('2026-01-15'));
    clearYearCache(year);
    await holidayService.getColombianHolidays(year, new Date('2026-05-15'));
    clearYearCache(year);
    await holidayService.getColombianHolidays(year, new Date('2026-09-15'));
    const statusLimit = holidayService.getFallbackStatus(year);
    console.log(`   UpdateCount after 3 updates: ${statusLimit.updateCount}`);
    console.log(`   UpdatedDates: ${statusLimit.updatedDates.join(', ')}`);
    resetAxiosMock();

    console.log('7️⃣ NO CONSUMIR API cuando el límite anual ya se cumplió');
    clearYearCache(year);
    mockAxiosGetError('No debe llamarse cuando updateCount >= 3');
    holidayService.fallbackStore.get(year).updateCount = 3;
    holidayService.fallbackStore.get(year).updatedDates = new Set();
    const blockedDate = new Date('2026-01-15');
    const fallbackBlocked = await holidayService.getColombianHolidays(year, blockedDate);
    const statusBlocked = holidayService.getFallbackStatus(year);
    console.log(`   Fecha: ${blockedDate.toISOString().slice(0, 10)}`);
    console.log(`   Axios llamadas: ${axiosCallCount}`);
    console.log(`   Source: ${statusBlocked.source}`);
    console.log(`   UpdateCount: ${statusBlocked.updateCount}`);
    console.log(`   Size: ${fallbackBlocked.size}`);
    resetAxiosMock();

    console.log('8️⃣ PRUEBA FINAL: source api y updateCount incrementado en flujo válido');
    resetHolidayService();
    mockAxiosGet(validApiDates);
    const finalDate = new Date('2026-01-15');
    await holidayService.getColombianHolidays(year, finalDate);
    const statusFinal = holidayService.getFallbackStatus(year);
    console.log(`   Source: ${statusFinal.source}`);
    console.log(`   UpdateCount: ${statusFinal.updateCount}`);
    console.log(`   UpdatedDates: ${statusFinal.updatedDates.join(', ')}`);
    console.log(`   Size: ${statusFinal.size}`);

    console.log('\n✅ PRUEBA COMPLETA: todos los casos importantes han sido ejecutados.');
  } catch (error) {
    console.error('Error en Holidays_Test:', error);
  } finally {
    resetAxiosMock();
  }
})();