const { pool } = require('../config/database');
const dynamoService = require('./dynamoService');
const logger = require('../utils/logger');

const CACHE_TTL_MS = 5 * 60 * 1000;
const _cache = new Map();

function _key(filters) {
  return JSON.stringify({
    startDate: filters.startDate || null,
    endDate:   filters.endDate   || null,
  });
}

function _cacheGet(filters) {
  const entry = _cache.get(_key(filters));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(_key(filters)); return null; }
  return entry.data;
}

function _cacheSet(filters, data) {
  _cache.set(_key(filters), { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function getLevelTeams() {
  const all = await dynamoService.getAllTeams();
  const n1 = all.find(t => t.id === 'level-n1');
  const n2 = all.find(t => t.id === 'level-n2');
  if (!n1 || !n2) {
    throw new Error('No se encontraron los registros level-n1 / level-n2 en sla-reporter-teams. Corre el seed primero.');
  }
  const map = {};
  (n1.agent_ids || []).forEach(id => { map[id] = 'n1'; });
  (n2.agent_ids || []).forEach(id => { map[id] = 'n2'; });
  return {
    map,
    n1Members: (n1.agent_ids || []).length,
    n2Members: (n2.agent_ids || []).length,
  };
}

function buildSegments(ticket, changes, now) {
  if (!changes.length) {
    if (!ticket.owner_id) return [];
    return [{
      owner: ticket.owner_id,
      from:  new Date(ticket.created_at),
      to:    ticket.close_at ? new Date(ticket.close_at) : now,
    }];
  }
  const segments = [];
  if (changes[0].prev_owner) {
    segments.push({
      owner: changes[0].prev_owner,
      from:  new Date(ticket.created_at),
      to:    new Date(changes[0].changed_at),
    });
  }
  for (let i = 0; i < changes.length - 1; i++) {
    segments.push({
      owner: changes[i].new_owner,
      from:  new Date(changes[i].changed_at),
      to:    new Date(changes[i + 1].changed_at),
    });
  }
  const last = changes[changes.length - 1];
  segments.push({
    owner: last.new_owner,
    from:  new Date(last.changed_at),
    to:    ticket.close_at ? new Date(ticket.close_at) : now,
  });
  return segments;
}

function percentile(sortedArr, p) {
  if (!sortedArr.length) return 0;
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(idx, sortedArr.length - 1))];
}

async function getSummary(filters = {}) {
  const cached = _cacheGet(filters);
  if (cached) {
    logger.info('[LevelService] Cache HIT', { key: _key(filters) });
    return cached;
  }

  const { startDate, endDate } = filters;
  if (!startDate || !endDate) {
    throw new Error('startDate y endDate son requeridos');
  }

  const { map: agentToLevel, n1Members, n2Members } = await getLevelTeams();
  const knownAgentIds = Object.keys(agentToLevel).map(Number);

  const client = await pool.connect();
  try {
    const ticketsRes = await client.query(
      `SELECT id, owner_id, created_at, close_at
       FROM tickets
       WHERE created_at >= $1 AND created_at < ($2::timestamp + interval '1 day')
         AND owner_id IS NOT NULL
         AND owner_id != 1`,
      [startDate, endDate]
    );

    let historyRes = { rows: [] };
    if (knownAgentIds.length > 0) {
      historyRes = await client.query(
        `SELECT
           h.o_id        AS ticket_id,
           h.id_from     AS prev_owner,
           h.id_to       AS new_owner,
           h.created_at  AS changed_at,
           h.created_by_id AS changed_by
         FROM histories h
         JOIN history_attributes ha ON ha.id = h.history_attribute_id
         JOIN tickets t             ON t.id = h.o_id
         WHERE ha.name = 'owner'
           AND t.created_at >= $1
           AND t.created_at < ($2::timestamp + interval '1 day')
         ORDER BY h.o_id, h.created_at`,
        [startDate, endDate]
      );
    }
    client.release();

    const tickets = ticketsRes.rows;
    const changesByTicket = {};
    for (const r of historyRes.rows) {
      if (!changesByTicket[r.ticket_id]) changesByTicket[r.ticket_id] = [];
      changesByTicket[r.ticket_id].push(r);
    }

    let n1Handled = 0, n2Handled = 0;
    let escalated = 0;
    const timesN1 = [], timesN2 = [];
    const escalators = {};
    const now = new Date();

    for (const ticket of tickets) {
      const currentLevel = agentToLevel[ticket.owner_id];
      if (currentLevel === 'n1') n1Handled++;
      else if (currentLevel === 'n2') n2Handled++;

      const changes = changesByTicket[ticket.id] || [];

      let didEscalate = false;
      for (const c of changes) {
        const fromLevel = agentToLevel[c.prev_owner];
        const toLevel   = agentToLevel[c.new_owner];
        if (fromLevel === 'n1' && toLevel === 'n2') {
          didEscalate = true;
          const escalatorId = c.prev_owner;
          escalators[escalatorId] = (escalators[escalatorId] || 0) + 1;
        }
      }
      if (didEscalate) escalated++;

      const segments = buildSegments(ticket, changes, now);
      let n1Hours = 0, n2Hours = 0;
      for (const seg of segments) {
        const hours = Math.max(0, (seg.to - seg.from) / (1000 * 60 * 60));
        const lvl = agentToLevel[seg.owner];
        if (lvl === 'n1') n1Hours += hours;
        else if (lvl === 'n2') n2Hours += hours;
      }
      if (n1Hours > 0) timesN1.push(n1Hours);
      if (n2Hours > 0) timesN2.push(n2Hours);
    }

    const stats = (arr) => {
      if (!arr.length) return { avgHours: 0, medianHours: 0, p95Hours: 0, count: 0 };
      const sorted = [...arr].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      return {
        avgHours:    +(sum / sorted.length).toFixed(2),
        medianHours: +percentile(sorted, 50).toFixed(2),
        p95Hours:    +percentile(sorted, 95).toFixed(2),
        count:       sorted.length,
      };
    };

    const agentNames = await getAgentNames(Object.keys(escalators).map(Number));
    const topEscalators = Object.entries(escalators)
      .map(([id, count]) => ({
        agentId: Number(id),
        name:    agentNames[id] || `Agente #${id}`,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalTickets = tickets.length;
    const result = {
      range: { from: startDate, to: endDate },
      totalTickets,
      byLevel: {
        n1: { handled: n1Handled, members: n1Members },
        n2: { handled: n2Handled, members: n2Members },
      },
      escalation: {
        receivedN1:     n1Handled + escalated,
        resolvedN1:     n1Handled,
        escalatedN2:    escalated,
        escalationRate: totalTickets > 0 ? +(escalated / totalTickets).toFixed(4) : 0,
      },
      timeStats: { n1: stats(timesN1), n2: stats(timesN2) },
      topEscalators,
    };

    _cacheSet(filters, result);
    return result;
  } catch (error) {
    try { client.release(); } catch (_) {}
    throw error;
  }
}

async function getAgentNames(agentIds) {
  if (!agentIds.length) return {};
  const client = await pool.connect();
  try {
    const ph = agentIds.map((_, i) => `$${i + 1}`).join(', ');
    const res = await client.query(
      `SELECT id, firstname, lastname FROM users WHERE id IN (${ph})`,
      agentIds
    );
    client.release();
    const map = {};
    res.rows.forEach(r => {
      const name = [r.firstname, r.lastname].filter(Boolean).join(' ').trim();
      map[r.id] = name || `Agente #${r.id}`;
    });
    return map;
  } catch (e) {
    try { client.release(); } catch (_) {}
    throw e;
  }
}

module.exports = { getSummary };
