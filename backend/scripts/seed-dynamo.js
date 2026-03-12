/**
 * seed-dynamo.js
 *
 * Script de seed único para poblar DynamoDB con los datos que antes
 * estaban hardcodeados en constants.js (EMPRESA_NAMES).
 *
 * Uso:
 *   cd backend
 *   node scripts/seed-dynamo.js
 *
 * Requiere: VPN activa + variables de entorno en backend/.env
 *           o IAM Instance Profile en EC2 con permisos DynamoDB.
 *
 * Los datos de equipos (teams) deben cargarse manualmente via API:
 *   PUT /api/admin/teams/:id
 */

require('dotenv').config();
const AWS = require('aws-sdk');

const REGION = process.env.AWS_REGION || 'us-east-1';
const PROJECTS_TABLE = process.env.DYNAMO_PROJECTS_TABLE || 'sla-reporter-projects';
const TEAMS_TABLE = process.env.DYNAMO_TEAMS_TABLE || 'sla-reporter-teams';

const dynamodb = new AWS.DynamoDB.DocumentClient({ region: REGION });

// ─── Reglas SLA por defecto (horas laborales → se multiplican x60 en getSLATargets) ───
// Para personalizar un proyecto, copiar esta estructura en su sla_targets.
const DEFAULT_SLA_TARGETS = {
  incidente: {
    '1':        { firstResponse: 1, resolution: 28 },
    critico:    { firstResponse: 1, resolution: 28 },
    '2':        { firstResponse: 2, resolution: 44 },
    alto:       { firstResponse: 2, resolution: 44 },
    urgente:    { firstResponse: 2, resolution: 44 },
    alta:       { firstResponse: 2, resolution: 44 },
    '3':        { firstResponse: 4, resolution: 56 },
    medio:      { firstResponse: 4, resolution: 56 },
    ordinaria:  { firstResponse: 4, resolution: 56 },
    media:      { firstResponse: 4, resolution: 56 },
    '4':        { firstResponse: 8, resolution: 80 },
    bajo:       { firstResponse: 8, resolution: 80 },
    leve:       { firstResponse: 8, resolution: 80 },
    baja:       { firstResponse: 8, resolution: 80 },
    '5':        { firstResponse: 8, resolution: 176 },
    planeado:   { firstResponse: 8, resolution: 176 }
  },
  requerimiento: {
    critico:    { firstResponse: 1, resolution: 28 },
    alto:       { firstResponse: 2, resolution: 44 },
    medio:      { firstResponse: 4, resolution: 56 },
    bajo:       { firstResponse: 8, resolution: 80 },
    planeado:   { firstResponse: 8, resolution: 176 }
  },
  default: { firstResponse: 4, resolution: 56 }
};

// ─── Datos de proyectos (antes EMPRESA_NAMES en constants.js) ─────────────────
// id          = valor de bld_cliente_padre en Zammad
// calendar_type = 'laboral' | 'continuo' | '24x7'
// sla_targets  = reglas SLA en horas (firstResponse / resolution)
//                Si un proyecto necesita reglas distintas, editar su sla_targets aquí
//                o directamente en DynamoDB. DEFAULT_SLA_TARGETS se aplica a todos.
const PROJECTS_SEED = [
  { id: '1',  empresa: 'Policía Nacional',                              calendar_type: '24x7',    sla_targets: DEFAULT_SLA_TARGETS },
  { id: '2',  empresa: 'Universidad Nacional',                          calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '3',  empresa: 'Coljuegos',                                     calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '4',  empresa: 'Alcaldía de Cali',                              calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '5',  empresa: 'Banco Interamericano de Desarrollo',            calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '6',  empresa: 'Blend360',                                      calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '7',  empresa: 'BTG',                                           calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '8',  empresa: 'Cámara de Comercio de Cali',                    calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '9',  empresa: 'Consejo Superior de la Judicatura',             calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '10', empresa: 'DIAN',                                          calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '11', empresa: 'Fiduagraria',                                   calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '12', empresa: 'Financiera Desarrollo Nacional',                calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '13', empresa: 'Fondo Adaptación',                              calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '14', empresa: 'ICFES',                                         calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '15', empresa: 'Justicia Penal Militar y Policial',             calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '16', empresa: 'Metro de Medellín',                             calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '17', empresa: 'MinTIC',                                        calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '18', empresa: 'Sanidad',                                       calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '19', empresa: 'Secretaría Distrital del Hábitat',              calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '20', empresa: 'Superintendencia de Servicios',                 calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '21', empresa: 'Superintendencia de Sociedades',                calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '22', empresa: 'Unidad Administrativa Especial de Catastro',    calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '23', empresa: 'Universidad de Caldas',                         calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '24', empresa: 'Universidad del Bosque',                        calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '25', empresa: 'Instituto Geográfico Militar',                  calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS },
  { id: '26', empresa: 'Progresión',                                    calendar_type: 'laboral', sla_targets: DEFAULT_SLA_TARGETS }
];

// ─── Ejemplo de equipos (completar con IDs reales de agentes de Zammad) ───────
// Los agent_ids son los IDs de usuarios en la tabla users de Zammad.
// Consultar: SELECT id, firstname, lastname FROM users WHERE active = true
const TEAMS_SEED = [
  // { id: 'soporte-n1', name: 'Soporte N1', agent_ids: [12, 34, 56], active: true },
  // { id: 'soporte-n2', name: 'Soporte N2', agent_ids: [78, 90],     active: true },
  // { id: 'cloud',      name: 'Cloud',      agent_ids: [23, 45],     active: true },
];

// ─────────────────────────────────────────────────────────────────────────────

async function seedProjects() {
  console.log(`\nSeeding tabla: ${PROJECTS_TABLE}`);
  let ok = 0;
  for (const project of PROJECTS_SEED) {
    try {
      await dynamodb.put({
        TableName: PROJECTS_TABLE,
        Item: { ...project, active: true }
      }).promise();
      console.log(`  ✓ [${project.id}] ${project.empresa}`);
      ok++;
    } catch (e) {
      console.error(`  ✗ [${project.id}] ${project.empresa} — ${e.message}`);
    }
  }
  console.log(`  ${ok}/${PROJECTS_SEED.length} proyectos cargados.\n`);
}

async function seedTeams() {
  if (TEAMS_SEED.length === 0) {
    console.log('Teams seed vacío — completar TEAMS_SEED en el script con los IDs reales de agentes.\n');
    return;
  }
  console.log(`Seeding tabla: ${TEAMS_TABLE}`);
  let ok = 0;
  for (const team of TEAMS_SEED) {
    try {
      await dynamodb.put({ TableName: TEAMS_TABLE, Item: team }).promise();
      console.log(`  ✓ [${team.id}] ${team.name}`);
      ok++;
    } catch (e) {
      console.error(`  ✗ [${team.id}] ${team.name} — ${e.message}`);
    }
  }
  console.log(`  ${ok}/${TEAMS_SEED.length} equipos cargados.\n`);
}

(async () => {
  console.log(`Region: ${REGION}`);
  console.log('Iniciando seed de DynamoDB...');
  try {
    await seedProjects();
    await seedTeams();
    console.log('Seed completado.');
  } catch (e) {
    console.error('Error fatal:', e.message);
    process.exit(1);
  }
})();
