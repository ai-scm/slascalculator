// backend/src/services/holidayService.js

const axios = require('axios');
const moment = require('moment-timezone');

class HolidayService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiration = 24 * 60 * 60 * 1000; // 24 horas
  }

  /**
   * Obtener festivos de Colombia desde API pública
   */
  async getColombianHolidays(year = new Date().getFullYear()) {
    const cacheKey = `holidays_${year}`;
    
    // Verificar cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiration) {
        console.log(`✅ [HolidayService] Usando cache para ${year}`);
        return cached.data;
      }
    }

    try {
      console.log(`🌐 [HolidayService] Consultando API para ${year}...`);
      
      const response = await axios.get(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/CO`,
        { timeout: 10000 }
      );

      const holidays = new Set(response.data.map(h => h.date));

      // Guardar en cache
      this.cache.set(cacheKey, {
        data: holidays,
        timestamp: Date.now()
      });

      console.log(`✅ [HolidayService] ${holidays.size} festivos obtenidos para ${year}`);
      return holidays;

    } catch (error) {
      console.error(`❌ [HolidayService] Error:`, error.message);
      return this.getFallbackHolidays(year);
    }
  }

  /**
   * Festivos de respaldo
   */
  getFallbackHolidays(year) {
    console.warn(`⚠️ [HolidayService] Usando fallback para ${year}`);
    
    return new Set([
      `${year}-01-01`, `${year}-05-01`, `${year}-07-20`,
      `${year}-08-07`, `${year}-12-08`, `${year}-12-25`
    ]);
  }

  /**
   * Verificar si una fecha es festivo
   */
  async isHoliday(date) {
    const year = moment(date).year();
    const holidays = await this.getColombianHolidays(year);
    return holidays.has(moment(date).format('YYYY-MM-DD'));
  }
}

module.exports = new HolidayService();