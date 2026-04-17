const moment = require('moment');
require('moment-business-days');
const { DATABASE } = require('../config/constants');
const holidayService = require('./holidayService'); // ← NUEVO

class WorkingHoursService {
  
  constructor() {
    // 1. Configurar festivos SÍNCRONOS (fallback inmediato)
    this.setupColombianHolidays();
    
    // 2. Actualizar en background con datos de API (sin bloquear)
    this.updateHolidaysFromAPI();
  }

  /**
   * Configurar días festivos de Colombia (VERSIÓN SÍNCRONA - SIN CAMBIOS)
   * Mantiene tu lógica actual como fallback
   */
  setupColombianHolidays() {
    const year = new Date().getFullYear();
    
    // Feriados fijos de Colombia
    const fixedHolidays = [
      moment(`${year}-01-01`), // Año Nuevo
      moment(`${year}-01-08`), // Reyes Magos
      moment(`${year}-03-25`), // San José
      moment(`${year}-05-01`), // Día del Trabajo
      moment(`${year}-07-01`), // San Pedro y San Pablo
      moment(`${year}-07-20`), // Independencia
      moment(`${year}-08-07`), // Batalla de Boyacá
      moment(`${year}-08-15`), // Asunción
      moment(`${year}-11-01`), // Todos los Santos
      moment(`${year}-12-08`), // Inmaculada Concepción
      moment(`${year}-12-25`) // Navidad
    ];

    // Feriados móviles (tu lógica actual)
    if (year === 2025) {
      fixedHolidays.push(moment('2025-04-18'));
      fixedHolidays.push(moment('2025-05-12'));
      fixedHolidays.push(moment('2025-05-19'));
    } else if (year === 2026) {
      fixedHolidays.push(moment('2026-04-03'));
      fixedHolidays.push(moment('2026-05-28'));
      fixedHolidays.push(moment('2026-06-04'));
    } else if (year > 2026) {
      console.warn(`[WorkingHoursService] Festivos móviles no configurados para ${year}.`);
    }

    this.holidayDates = new Set(fixedHolidays.map(d => d.format('YYYY-MM-DD')));
    console.log(`📅 [WorkingHoursService] Festivos iniciales: ${this.holidayDates.size} (año ${year})`);
  }

  /**
   * NUEVO: Actualizar festivos desde API en background
   * No bloquea la inicialización del servicio
   */
  updateHolidaysFromAPI() {
    const year = new Date().getFullYear();
    
    // Ejecutar en background (no await, no bloquea)
    holidayService.getColombianHolidays(year)
      .then(apiHolidays => {
        if (apiHolidays.size > 0) {
          const beforeCount = this.holidayDates.size;
          this.holidayDates = apiHolidays;
          console.log(`✅ [WorkingHoursService] Festivos actualizados desde API: ${beforeCount} → ${apiHolidays.size}`);
        }
      })
      .catch(error => {
        console.warn(`⚠️ [WorkingHoursService] No se pudo actualizar desde API, usando fallback:`, error.message);
      });
  }

  /**
   * OPCIONAL: Método para forzar actualización manual
   */
  async refreshHolidays(year = new Date().getFullYear()) {
    try {
      const apiHolidays = await holidayService.getColombianHolidays(year);
      this.holidayDates = apiHolidays;
      console.log(`✅ [WorkingHoursService] Festivos refrescados manualmente: ${apiHolidays.size}`);
      return true;
    } catch (error) {
      console.error(`❌ [WorkingHoursService] Error al refrescar festivos:`, error);
      return false;
    }
  }
  /**
   * Seleccionar tipo de calendario y ajustar parámetros
   * @param {string} calendarType - 'laboral', 'continuo', '24x7'
   */
  getCalendarConfig(calendarType) {
    const type = calendarType || 'laboral';
    const config = {
      type: type,
      holidayDates: this.holidayDates
    };

    switch(type) {
      case 'laboral':
        config.workStartHour = 8;
        config.workEndHour = 17;
        config.hoursPerDay = 9;
        config.workingDays = [1, 2, 3, 4, 5];
        config.excludeHolidays = true;
        break;

      case 'continuo':
      case 'extended':
        config.workStartHour = 8;
        config.workEndHour = 18;
        config.hoursPerDay = 10;
        config.workingDays = [1, 2, 3, 4, 5];
        config.excludeHolidays = false;
        break;

      case '24-7':
      case '24x7':
        config.workStartHour = 0;
        config.workEndHour = 24;
        config.hoursPerDay = 24;
        config.workingDays = [0, 1, 2, 3, 4, 5, 6];
        config.excludeHolidays = false;
        break;

      default:
        return this.getCalendarConfig('laboral');
    }

    return config;
  }

  /**
   * Calcular minutos laborales entre dos fechas
   * @param {Date|string} startDate - Fecha de inicio
   * @param {Date|string} endDate - Fecha de fin
   * @param {string} calendarType - Tipo de calendario ('laboral', '24-7', 'extended')
   * @returns {number} Minutos laborales
   */
  calculateWorkingMinutes(startDate, endDate, calendarType = 'laboral') {
    if (!startDate || !endDate) return 0;

    const config = this.getCalendarConfig(calendarType);

    // Fast path para 24x7: simple diferencia de milisegundos, sin loop de días
    if (calendarType === '24x7' || calendarType === '24-7') {
      const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
      return diffMs > 0 ? Math.round(diffMs / 60000) : 0;
    }

    // Interpretamos las fechas en UTC-5 (Colombia) para que .hour() devuelva
    // la hora local correcta al comparar contra el horario laboral.
    const start = moment(startDate).utcOffset(DATABASE.DB_UTC_OFFSET);
    const end = moment(endDate).utcOffset(DATABASE.DB_UTC_OFFSET);

    if (end.isBefore(start)) return 0;

    // Si es la misma fecha, calcular solo horas dentro del horario laboral
    if (start.format('YYYY-MM-DD') === end.format('YYYY-MM-DD')) {
      return this.calculateMinutesInSameDay(start, end, config);
    }

    let totalMinutes = 0;

    // Minutos restantes del primer día
    totalMinutes += this.calculateMinutesUntilEndOfDay(start, config);

    // Días completos laborales usando Date nativo (mucho más rápido que moment en loops)
    const startNative = start.toDate();
    const endNative = end.toDate();
    let current = new Date(startNative);
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
    const endDayStart = new Date(endNative);
    endDayStart.setHours(0, 0, 0, 0);

    while (current < endDayStart) {
      if (this._isWorkingDayFast(current, config)) {
        totalMinutes += config.hoursPerDay * 60;
      }
      current.setDate(current.getDate() + 1);
    }

    // Minutos desde inicio del día hasta la hora final del último día
    totalMinutes += this.calculateMinutesFromStartOfDay(end, config);

    return Math.round(totalMinutes);
  }

  /**
   * Versión optimizada de isWorkingDay usando Date nativo (evita crear objetos moment en loops)
   */
  _isWorkingDayFast(date, config) {
    const dayOfWeek = date.getDay();
    if (!config.workingDays.includes(dayOfWeek)) return false;
    if (config.excludeHolidays) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      if (config.holidayDates.has(`${y}-${m}-${d}`)) return false;
    }
    return true;
  }
  /**
   * Calcular minutos laborales en el mismo día
   */
  calculateMinutesInSameDay(startTime, endTime, config) {
    const start = moment(startTime);
    const end = moment(endTime);

    // Si no es día laboral, retornar 0
    if (!this.isWorkingDay(start, config)) {
      return 0;
    }

    // Ajustar horas a rango laboral
    let startHour = start.hour();
    let endHour = end.hour();
    let startMinute = start.minute();
    let endMinute = end.minute();

    // Si comienza antes del horario laboral
    if (startHour < config.workStartHour) {
      startHour = config.workStartHour;
      startMinute = 0;
    }

    // Si termina después del horario laboral
    if (endHour > config.workEndHour || (endHour === config.workEndHour && endMinute > 0)) {
      endHour = config.workEndHour;
      endMinute = 0;
    }

    // Calcular minutos
    const startInMinutes = startHour * 60 + startMinute;
    const endInMinutes = endHour * 60 + endMinute;

    return Math.max(0, endInMinutes - startInMinutes);
  }

  /**
   * Calcular minutos desde inicio del día laboral hasta cierta hora
   */
  calculateMinutesFromStartOfDay(time, config) {
    const m = moment(time);

    if (!this.isWorkingDay(m, config)) {
      return 0;
    }

    let hour = m.hour();
    let minute = m.minute();

    // Si es antes del inicio del horario laboral
    if (hour < config.workStartHour) {
      return 0;
    }

    // Si es después del final del horario laboral
    if (hour >= config.workEndHour) {
      return config.hoursPerDay * 60;
    }

    // Está dentro del horario laboral
    return (hour - config.workStartHour) * 60 + minute;
  }

  /**
   * Calcular minutos desde cierta hora hasta fin del día laboral
   */
  calculateMinutesUntilEndOfDay(time, config) {
    const m = moment(time);

    if (!this.isWorkingDay(m, config)) {
      return 0;
    }

    let hour = m.hour();
    let minute = m.minute();

    // Si es antes del inicio del horario laboral
    if (hour < config.workStartHour) {
      return config.hoursPerDay * 60;
    }

    // Si es después del final del horario laboral
    if (hour >= config.workEndHour) {
      return 0;
    }

    // Está dentro del horario laboral
    return (config.workEndHour - hour) * 60 - minute;
  }

  /**
   * Verificar si es día laboral según el calendario actual
   */
  isWorkingDay(date, config) {
    const m = moment(date);
    
    // Verificar si el día está en la lista de días laborales
    const dayOfWeek = m.day(); // 0 = Domingo, 1 = Lunes, etc.
    
    if (!config.workingDays.includes(dayOfWeek)) {
      return false;
    }

    // Verificar si es festivo (solo si excluimos festivos)
    if (config.excludeHolidays && config.holidayDates.has(m.format('YYYY-MM-DD'))) {
      return false;
    }

    return true;
  }

  /**
   * Convertir minutos a formato legible
   * @param {number} minutes - Minutos
   * @param {string} calendarType - Tipo de calendario para formateo correcto
   * @returns {string} Formato: "X minutos"
   */
  formatMinutes(minutes, calendarType = 'laboral') {
    if (!minutes || minutes === 0) return '0 minutos';

    const mins = Math.round(minutes);
    return `${mins} minutos`;
  }

  /**
   * Obtener información sobre el calendario actual
   */
  getCalendarInfo() {
    return this.getCalendarConfig('laboral');
  }
}

module.exports = new WorkingHoursService();
