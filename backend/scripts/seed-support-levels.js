/**
 * seed-support-levels.js
 *
 * Lee backend/scripts/support-levels.json, resuelve los emails contra
 * users.email en Zammad para obtener agent_ids, y sube 2 records a
 * DynamoDB (sla-reporter-teams) con type='level': "level-n1" y "level-n2".
 *
 * Uso:
 *   cd backend
 *   node scripts/seed-support-levels.js              # escribe a DynamoDB
 *   node scripts/seed-support-levels.js --dry-run    # solo muestra el plan
 *
 * Requiere:
 *   - VPN activa (acceso a RDS Zammad)
 *   - backend/.env con DB_* y AWS_REGION
 *   - IAM credentials con permisos dynamodb:PutItem en sla-reporter-teams
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const AWS = require('aws-sdk');

const REGION       = process.env.AWS_REGION         || 'us-east-1';
const TEAMS_TABLE  = process.env.DYNAMO_TEAMS_TABLE || 'sla-reporter-teams';
const DRY_RUN      = process.argv.includes('--dry-run');
const JSON_PATH    = path.join(__dirname, 'support-levels.json');

const dynamodb = new AWS.DynamoDB.DocumentClient({ region: REGION });

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  console.log(`\nLeyendo: ${JSON_PATH}`);
  const config = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const levels = config.levels || [];

  if (levels.length === 0) {
    console.error('Error: support-levels.json no contiene niveles.');
    process.exit(1);
  }

  const allEmails = [...new Set(
    levels.flatMap(l => (l.emails || []).map(e => e.trim().toLowerCase()))
  )].filter(e => e && !e.startsWith('todo_'));

  if (allEmails.length === 0) {
    console.error('Error: no hay emails validos para resolver.');
    process.exit(1);
  }

  console.log(`  Niveles definidos: ${levels.length}`);
  console.log(`  Emails unicos a resolver: ${allEmails.length}`);

  console.log('\nConectando a Zammad DB...');
  const client = await pool.connect();
  const placeholders = allEmails.map((_, i) => `$${i + 1}`).join(', ');
  const result = await client.query(
    `SELECT id, email, active FROM users WHERE LOWER(email) IN (${placeholders})`,
    allEmails
  );
  client.release();

  const emailToId = {};
  const inactive = [];
  for (const row of result.rows) {
    const email = row.email.toLowerCase();
    if (row.active) emailToId[email] = row.id;
    else inactive.push(email);
  }

  const noMatch = allEmails.filter(e => emailToId[e] === undefined && !inactive.includes(e));

  console.log(`  Resueltos: ${Object.keys(emailToId).length}/${allEmails.length}`);
  if (inactive.length) console.log(`  Inactivos en Zammad: ${inactive.join(', ')}`);
  if (noMatch.length)  console.log(`  Sin match: ${noMatch.join(', ')}`);

  const items = levels.map(level => {
    const emails = (level.emails || [])
      .map(e => e.trim().toLowerCase())
      .filter(e => e && !e.startsWith('todo_'));
    const agent_ids = emails.map(e => emailToId[e]).filter(id => id !== undefined);
    return {
      id:        level.id,
      name:      level.name,
      type:      'level',
      agent_ids,
      active:    true,
      updated_at: new Date().toISOString(),
    };
  });

  console.log('\nPlan de carga:');
  for (const item of items) {
    console.log(`  [${item.id}] ${item.name} → ${item.agent_ids.length} agentes`);
  }

  if (DRY_RUN) {
    console.log('\n-- DRY RUN: no se escribio nada en DynamoDB --');
    await pool.end();
    return;
  }

  console.log(`\nEscribiendo en DynamoDB: ${TEAMS_TABLE}`);
  let ok = 0;
  for (const item of items) {
    try {
      await dynamodb.put({ TableName: TEAMS_TABLE, Item: item }).promise();
      console.log(`  OK  ${item.id}`);
      ok++;
    } catch (e) {
      console.error(`  ERR ${item.id} — ${e.message}`);
    }
  }

  console.log(`\n${ok}/${items.length} niveles cargados.`);
  await pool.end();
}

main().catch(e => {
  console.error('Error fatal:', e.message);
  process.exit(1);
});
