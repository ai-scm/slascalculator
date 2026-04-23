// backend/src/services/holidayService.js

const axios = require('axios');
const moment = require('moment-timezone');

class HolidayService {
  constructor() {
    this.cache = new Map();
    this.fallbackStore = new Map();
    this.cacheExpiration = 24 * 60 * 60 * 1000; // 24 horas
    this.updateWindows = [
      { month: 1, day: 15 },
      { month: 5, day: 15 },
      { month: 9, day: 15 }
    ];
    this.minimumHolidayCount = 15;
    this.maximumHolidayCount = 25;
  }

  _formatDate(date) {
    return moment.utc(date).format('YYYY-MM-DD');
  }

  _isValidDateString(date) {
    return moment.utc(date, 'YYYY-MM-DD', true).isValid();
  }

  _buildStaticFallback(year) {
    return new Set([
      `${year}-01-01`, `${year}-05-01`, `${year}-07-20`,
      `${year}-08-07`, `${year}-12-08`, `${year}-12-25`
    ]);
  }

  _getFallbackMeta(year) {
    if (!this.fallbackStore.has(year)) {
      this.fallbackStore.set(year, {
        holidays: this._buildStaticFallback(year),
        source: 'static',
        updatedAt: null,
        updateCount: 0,
        updatedDates: new Set()
      });
    }

    return this.fallbackStore.get(year);
  }

  getFallbackStatus(year) {
    const meta = this._getFallbackMeta(year);
    return {
      year,
      source: meta.source,
      size: meta.holidays.size,
      updatedAt: meta.updatedAt,
      updateCount: meta.updateCount,
      updatedDates: Array.from(meta.updatedDates).sort()
    };
  }

  _isAllowedUpdateDate(date = new Date()) {
    const utcDate = moment.utc(date);
    const month = utcDate.month() + 1;
    const day = utcDate.date();

    return this.updateWindows.some(window => window.month === month && window.day === day);
  }

  _canAttemptApiUpdate(year, currentDate = new Date()) {
    const meta = this._getFallbackMeta(year);
    const today = this._formatDate(currentDate);

    if (!this._isAllowedUpdateDate(currentDate)) {
      return { allowed: false, reason: `Fecha fuera de ventana de actualización (${today})` };
    }

    if (meta.updatedDates.has(today)) {
      return { allowed: false, reason: `Ya se actualizó el fallback hoy (${today})` };
    }

    if (meta.updateCount >= this.updateWindows.length) {
      return { allowed: false, reason: `Límite anual de actualizaciones alcanzado (${meta.updateCount})` };
    }

    return { allowed: true, reason: `Fecha válida para actualización (${today})` };
  }

  _validateApiResponse(responseData, year) {
    const result = {
      valid: false,
      holidays: new Set(),
      errors: []
    };

    if (!Array.isArray(responseData)) {
      result.errors.push('La respuesta de la API no es un array.');
      return result;
    }

    responseData.forEach((item, index) => {
      if (!item || typeof item.date !== 'string') {
        result.errors.push(`Elemento ${index} no tiene campo 'date' válido.`);
        return;
      }

      if (!this._isValidDateString(item.date)) {
        result.errors.push(`Fecha inválida en elemento ${index}: ${item.date}`);
        return;
      }

      const itemYear = moment.utc(item.date, 'YYYY-MM-DD', true).year();
      if (itemYear !== year) {
        result.errors.push(`Fecha fuera del año ${year} en elemento ${index}: ${item.date}`);
        return;
      }

      result.holidays.add(item.date);
    });

    if (result.holidays.size < this.minimumHolidayCount) {
      result.errors.push(`Cantidad de fechas válidas menor al mínimo esperado (${result.holidays.size} < ${this.minimumHolidayCount}).`);
    }

    if (result.holidays.size > this.maximumHolidayCount) {
      result.errors.push(`Cantidad de fechas válidas mayor al máximo esperado (${result.holidays.size} > ${this.maximumHolidayCount}).`);
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  async getColombianHolidays(year = new Date().getFullYear(), currentDate = new Date()) {
    const cacheKey = `holidays_${year}`;
    const meta = this._getFallbackMeta(year);
    const apiAttempt = this._canAttemptApiUpdate(year, currentDate);

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiration) {
        if (!apiAttempt.allowed) {
          console.log(`✅ [HolidayService] Usando cache para ${year} (sin intentar API): ${apiAttempt.reason}`);
          return cached.data;
        }
      }
    }

    if (!apiAttempt.allowed) {
      console.log(`⚠️ [HolidayService] ${apiAttempt.reason}. Usando fallback (${meta.source}).`);
      return meta.holidays;
    }

    const today = this._formatDate(currentDate);
    console.log(`🌐 [HolidayService] Fecha de actualización permitida: ${today}. Intentando API para ${year}...`);

    try {
      const response = await axios.get(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/CO`,
        { timeout: 10000 }
      );

      const validation = this._validateApiResponse(response.data, year);
      if (!validation.valid) {
        console.error(`❌ [HolidayService] Respuesta de API inválida para ${year}:`, validation.errors);
        return meta.holidays;
      }

      const holidays = validation.holidays;
      this.cache.set(cacheKey, {
        data: holidays,
        timestamp: Date.now()
      });

      meta.holidays = holidays;
      meta.source = 'api';
      meta.updatedAt = Date.now();
      meta.updatedDates.add(today);
      meta.updateCount += 1;

      console.log(`✅ [HolidayService] ${holidays.size} festivos válidos obtenidos para ${year}.`);
      console.log(`📝 [HolidayService] Fallback actualizado desde API (${meta.updateCount}/3 actualizaciones anuales).`);

      return holidays;
    } catch (error) {
      console.error(`❌ [HolidayService] Error al consultar API para ${year}:`, error.message);
      return meta.holidays;
    }
  }

  getFallbackHolidays(year) {
    const meta = this._getFallbackMeta(year);
    return meta.holidays;
  }

  async isHoliday(date) {
    const year = moment(date).year();
    const holidays = await this.getColombianHolidays(year);
    return holidays.has(moment(date).format('YYYY-MM-DD'));
  }
}

module.exports = new HolidayService();