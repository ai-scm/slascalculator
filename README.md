# Blend 360 - Reportes SLA para Zammad

Sistema de reportes de Acuerdos de Nivel de Servicio (SLA) para tickets de Zammad. Permite visualizar métricas, cumplimiento de SLA, análisis por niveles de soporte (N1/N2) y exportar informes en Excel.

## Requisitos

- Node.js 20+ (solo para desarrollo local)
- Acceso a la base de datos PostgreSQL de Zammad
- Docker y Docker Compose (para producción)
- VPN corporativa (para acceder a la EC2 y al RDS)

## Estructura del proyecto

```
slascalculator/
├── backend/                  # API Express (Node.js)
│   ├── server.js             # Servidor principal
│   ├── Dockerfile            # Imagen multi-stage: compila frontend + backend
│   ├── routes/
│   │   ├── api.js            # Endpoints principales (métricas, tickets, reportes)
│   │   └── admin.js          # CRUD de proyectos y equipos (DynamoDB)
│   ├── services/
│   │   ├── slaService.js     # Lógica principal de cálculo SLA
│   │   ├── levelService.js   # Análisis de niveles de soporte (N1 vs N2)
│   │   ├── excelService.js   # Generación de reportes Excel
│   │   ├── chartGeneratorService.js  # Generación de gráficos para Excel
│   │   ├── workingHoursService.js    # Cálculo de horas laborales/calendario
│   │   └── dynamoService.js  # Acceso a DynamoDB (proyectos, equipos)
│   ├── cron/
│   │   ├── cron-scheduler.js       # Programador de tareas
│   │   └── sla-exporter-cron.js    # Exportación diaria a S3/QuickSight
│   ├── scripts/
│   │   ├── seed-dynamo.js          # Seed de proyectos en DynamoDB
│   │   ├── seed-teams-from-csv.js  # Seed de equipos desde CSV
│   │   ├── seed-support-levels.js  # Seed de niveles N1/N2
│   │   └── support-levels.json     # Definición de agentes por nivel
│   ├── middleware/            # Validadores Express
│   ├── utils/                 # Logger
│   └── config/
│       ├── database.js        # Pool de conexiones PostgreSQL
│       ├── dynamodb.js        # Cliente DynamoDB
│       └── constants.js       # UTC offset, estados, SLA targets
├── frontend/                 # App React (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/       # Button, Badge, Card, Input, Select, Toast, etc.
│   │   │   ├── metrics/      # MetricCard, SLAProgress, CalendarSelector
│   │   │   ├── filters/      # FilterPanel (fechas, proyecto, agente, estado, tipo, equipo)
│   │   │   ├── charts/       # SLATrendChart, TicketDistribution, TicketsByState, SupportLevelsView
│   │   │   ├── tables/       # TicketsTable con paginación y ordenamiento
│   │   │   └── modals/       # TicketDetailModal, VPNConnectionModal
│   │   ├── context/          # AppContext (estado global)
│   │   ├── pages/            # Dashboard.jsx (página principal)
│   │   └── services/         # api.js (llamadas al backend con manejo de VPN)
│   └── public/               # Assets estáticos (logo)
├── aws/                      # Infraestructura AWS
│   ├── cloudformation.yml    # Stack: S3, Glue, IAM
│   └── deploy-infra.sh       # Script de despliegue de infra
├── docs/
│   └── diagrams/             # Diagramas de arquitectura (.drawio)
│       ├── 01-conexion-red.drawio
│       ├── 02-arquitectura-software.drawio
│       ├── 03-arquitectura-hardware.drawio
│       ├── 04-pipeline-quicksight.drawio
│       └── 05-Conexion y Red — VPN Site-to-Site.drawio
├── docker-compose.yml        # Orquestación de contenedores
├── deploy.sh                 # Script de deploy automatizado
├── deploy-remote.sh          # Deploy remoto
├── DATABASE_DICTIONARY.md    # Diccionario de la base de datos de Zammad (124 tablas)
└── README.md
```

## Desarrollo local

1. Configurar variables de entorno:
```bash
cp .env.example backend/.env
```
Editar `backend/.env` con las credenciales reales de la base de datos.

2. Instalar dependencias:
```bash
npm run install:all
```

3. Iniciar en modo desarrollo (backend + frontend con hot reload):
```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

## Producción

### Infraestructura

| Componente | Servicio | Detalle |
|---|---|---|
| Backend + Frontend | EC2 (Node.js directo) | `10.67.4.151` (IP privada, requiere VPN) |
| Base de datos | RDS PostgreSQL | Base de datos de Zammad (solo lectura) |
| Configuración | DynamoDB | Proyectos, equipos y niveles de soporte |
| Pipeline de datos | S3 + Glue + Athena | Exportación diaria para QuickSight |
| Dashboards | AWS QuickSight | Visualización ejecutiva de SLAs |
| Puerto | 443 | Expuesto directamente por Node.js (`sudo setcap` para bind sin root) |

### Despliegue

El proyecto se despliega **manualmente** en EC2 cuando hay cambios.

#### Opción 1: Usar `deploy.sh` (Recomendado)

```bash
# Setup inicial (una sola vez)
cp .env.deploy.example .env.deploy
# Editar .env.deploy con:
#   EC2_KEY="/ruta/a/tu-clave.pem"
#   EC2_HOST="10.67.4.151"
#   EC2_USER="ec2-user"

# Deploy (push + instala en EC2)
./deploy.sh

# Deploy sin push a GitHub
./deploy.sh --no-push

# Deploy + mostrar logs al final
./deploy.sh --logs
```

#### Opción 2: Deploy manual SSH

```bash
# 1. Conectarse a la EC2 (requiere VPN activa)
ssh -i "clave.pem" ec2-user@10.67.4.151

# 2. Traer cambios y reconstruir
cd /home/ec2-user/slascalculator
git pull origin main
npm install --prefix backend --production
npm install --prefix frontend
npm run build --prefix frontend

# 3. Reiniciar el servidor con PM2
pm2 reload sla-reporter

# 4. Verificar que levantó
pm2 logs sla-reporter --lines 50
```

**Comandos útiles en producción:**

```bash
# Ver logs en tiempo real
pm2 logs sla-reporter

# Verificar que el proceso está corriendo
pm2 status

# Reiniciar el servidor
pm2 reload sla-reporter

# Detener el servidor
pm2 stop sla-reporter

# Ver información detallada del proceso
pm2 show sla-reporter
```

> **Nota:** El servidor corre con PM2 (process manager) que reinicia automáticamente si hay un crash. El `PORT=443` está configurado en `backend/.env`.

### URL de la aplicación

```
URL para acceso desde fuera de la compañia con VPN ---      http://10.67.4.151
URL para acceso sin VPN desde la compañia ------------      https://sla.helpdesk.ia.blend360.com/
URL del alojamiento en el HOUNDOC --------------------      https://app.ia.blend360.com/embedding/bc97b93c-8000-4179-aa96-093b1fcfef87
```

Requiere VPN corporativa activa (puerto 443, no es necesario especificarlo en la URL).

## Calendarios SLA soportados

| Tipo | Horario | Horas/día | Días | Festivos Colombia |
|---|---|---|---|---|
| `laboral` | 8:00–17:00 | 9 h | Lunes a Viernes | Excluidos |
| `continuo` | 8:00–18:00 | 10 h | Lunes a Viernes | No excluidos |
| `24x7` | 00:00–24:00 | 24 h | Todos los días | No excluidos |

## API — Endpoints

### Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/projects` | Proyectos disponibles (desde DynamoDB) |
| `GET` | `/api/teams` | Equipos activos (desde DynamoDB) |
| `GET` | `/api/agents` | Agentes disponibles (desde Zammad) |
| `GET` | `/api/ticket-types` | Tipos de ticket |
| `GET` | `/api/ticket-states` | Estados de ticket |
| `POST` | `/api/metrics` | Métricas SLA filtradas |
| `POST` | `/api/tickets` | Tickets con información SLA |
| `POST` | `/api/tickets-with-durations` | Tickets con duraciones por estado |
| `GET` | `/api/ticket-history/:number` | Historial detallado de un ticket |
| `POST` | `/api/levels/summary` | Resumen de niveles de soporte (N1 vs N2) |
| `POST` | `/api/generate-report` | Generar reporte Excel completo |
| `POST` | `/api/generate-filtered-report` | Generar reporte Excel filtrado |
| `POST` | `/api/export/quicksight` | Exportar data aplanada para QuickSight |

### Endpoints de administración

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/admin/projects` | Listar todos los proyectos |
| `GET` | `/api/admin/projects/:id` | Obtener un proyecto |
| `PUT` | `/api/admin/projects/:id` | Crear o actualizar proyecto |
| `DELETE` | `/api/admin/projects/:id` | Eliminar proyecto |
| `GET` | `/api/admin/teams` | Listar todos los equipos |
| `GET` | `/api/admin/teams/:id` | Obtener un equipo |
| `PUT` | `/api/admin/teams/:id` | Crear o actualizar equipo |
| `DELETE` | `/api/admin/teams/:id` | Eliminar equipo |

### `POST /api/metrics`

Retorna métricas SLA filtradas.

**Request Body (todos los campos son opcionales):**
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-02-28",
  "organizationId": 5,
  "ownerId": 10,
  "teamId": "gerencia-cloud",
  "state": "Abierto",
  "type": "Incidente",
  "calendarType": "laboral"
}
```

### `POST /api/levels/summary`

Retorna análisis de niveles de soporte N1 vs N2: tickets atendidos por nivel, tasa de escalamiento, tiempos promedio, top escaladores y organizaciones por nivel.

**Request Body:**
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-02-28",
  "organizationId": 5,
  "type": "Incidente",
  "page": 1,
  "pageSize": 10
}
```

### `POST /api/export/quicksight`

Retorna toda la data de SLA en formato aplanado (sin objetos anidados), listo para ser consumido por una Lambda de AWS y escrito a S3 como Parquet para QuickSight.

**Request Body (todos los campos son opcionales):**
```json
{
  "startDate": "2026-01-01T00:00:00Z",
  "endDate": "2026-02-28T23:59:59Z",
  "organizationId": 5,
  "ownerId": 10,
  "state": "Abierto",
  "type": "Incidente",
  "calendarType": "laboral"
}
```

**Response:**
```json
{
  "success": true,
  "metadata": {
    "exported_at": "2026-02-23T20:53:00.000Z",
    "filters_applied": {},
    "total_records": 245
  },
  "data": {
    "tickets": [
      {
        "ticket_id": 1001,
        "ticket_number": "1001",
        "title": "No puedo acceder al sistema",
        "type": "Incidente",
        "state": "Cerrado",
        "priority": "Media",
        "organization": "[P2068] UNA - Contrato 4",
        "empresa": "Universidad Nacional",
        "owner": "Juan Perez",
        "customer": "Maria Lopez",
        "created_at": "2026-01-15T14:30:00.000Z",
        "close_at": "2026-01-17T19:45:00.000Z",
        "hightech_time_minutes": 240,
        "client_time_minutes": 120,
        "first_response_time_minutes": 45,
        "sla_first_response_target_minutes": 240,
        "sla_resolution_target_minutes": 3360,
        "first_response_sla_met": true,
        "resolution_sla_met": true
      }
    ],
    "summary": {
      "total_tickets": 245,
      "closed_tickets": 180,
      "open_tickets": 65,
      "first_response_compliance_rate": "85.71",
      "resolution_compliance_rate": "79.59"
    },
    "by_agent": [...],
    "by_organization": [...],
    "by_type": [...]
  }
}
```

### Pipeline AWS QuickSight (CRON → S3 → Glue → QuickSight)

```
EC2 CRON (6x/día, Lun-Sáb)      Glue Crawler (auto-trigger)      QuickSight ────► Externo (Refresh de dashboard)
       │                                │                              │
       ▼                                ▼                              ▼
 Zammad DB ──► Parquet ──► S3 ──► Glue Data Catalog ──► Athena ──► SPICE Dataset
 (PostgreSQL)   (3 tablas)   │         (auto-discover)              (auto-refresh)
                             │
                             └── sla-data/
                                   ├── tickets/data.parquet
                                   └── tickets_full/data.parquet
```

**Características del pipeline:**

- 6 exportaciones diarias: 06:00, 09:00, 12:00, 15:00, 18:00 y 22:00 (hora Colombia)
- Activo de lunes a sábado (`1-6`), sin ejecución los domingos
- Ejecución inicial automática al arrancar el servidor
- El Glue Crawler se dispara automáticamente después de cada exportación (no tiene horario propio independiente)
- Conversión de fechas a formato ISO 8601 para compatibilidad con QuickSight
- Limpieza automática de archivos locales después de subir a S3
- Refresh automático de datasets de QuickSight (si está configurado con `AWS_QUICKSIGHT_DATASET_ID`)

**Tablas en Glue Data Catalog:**

| Tabla | Descripción | Registros aprox | Columnas destacadas |
|---|---|---|---|
| `tickets` | Todos los tickets con métricas SLA aplanadas | ~2,700+ | `ticket_id`, `ticket_label`, `duration_days`, `state`, `created_at`, `close_at`, `first_response_sla_met`, `resolution_sla_met` |
| `ticket_timelines` | Historial de cambios de estado por ticket | ~21,000+ | `ticket_number`, `state`, `start_time`, `end_time`, `duration_minutes`, `period_type` |
| `tickets_full` | Consolidado de tickets + timelines con columnas calculadas | ~21,000+ | Todas las anteriores + `ticket_label`, `duration_days`, `resolution_flag`, `resolution_status`, `SLA_Status` |

**Columnas calculadas en tickets_full:**

- `ticket_label`: Número del ticket (mismo valor que `ticket_number`)
- `duration_days`: Duración en días desde la creación hasta el cierre (o hasta ahora si está abierto)
- `resolution_flag`: "Met" | "Breached" | "Open" (estado del SLA de resolución)
- `resolution_status`: "Closed" | "Open" (estado del ticket)
- `SLA_Status`: "Met" | "Breached" | "Open" (estado general del SLA - solo es "Met" si el ticket está cerrado Y ambos SLAs se cumplieron)

**Costos estimados:**

| Servicio | Costo/mes |
|---|---|
| S3 (storage ~50MB + PUTs) | ~$0.01 |
| Glue Crawler (6 runs/día x 30 días) | ~$1.80 |
| Glue Data Catalog (3 tablas) | $0.00 (free tier) |
| QuickSight Author (1 usuario) | $12-24 |
| **Total** | **~$14-26** |

**Nota sobre costos:** El CRON se ejecuta 6 veces al día (06:00, 09:00, 12:00, 15:00, 18:00, 22:00 Colombia, de Lunes a Sábado), lo que representa aproximadamente $1.80/mes en Glue Crawler (6 ejecuciones × 30 días × $0.30 por ejecución).

### Desplegar infraestructura AWS

```bash
# 1. Desplegar S3 + Glue + IAM
./aws/deploy-infra.sh

# 2. Ver outputs (bucket name, crawler name, instance profile)
./aws/deploy-infra.sh --outputs

# 3. Agregar variables al .env en la EC2
#   AWS_S3_BUCKET=<bucket-name-del-output>
#   AWS_GLUE_CRAWLER_NAME=<crawler-name-del-output>
#   AWS_REGION=us-east-1

# 4. Asociar el Instance Profile a la EC2
aws ec2 associate-iam-instance-profile \
  --instance-id <INSTANCE-ID> \
  --iam-instance-profile Name=zammad-sla-reporter-ec2-profile-prod

# 5. Ejecutar el CRON manualmente para verificar
cd /home/ec2-user/slascalculator/backend
node -e "require('./cron/sla-exporter-cron').exportSLAToQuickSight().then(console.log)"

# 6. Conectar QuickSight:
#    QuickSight → Datasets → New dataset → Athena
#    Database: zammad_sla_db
#    Tables: tickets, ticket_timelines, tickets_full
#
# 7. Configurar auto-refresh en QuickSight:
#    - Agregar AWS_QUICKSIGHT_DATASET_ID (separar con coma si son varios) y AWS_ACCOUNT_ID al .env
#    - El CRON disparará automáticamente el refresh de QuickSight después de cada exportación
#    - Asegurarse de que el rol IAM tenga permisos quicksight:CreateIngestion
```

### Análisis del Dashboard de QuickSight

La documentación detallada del dashboard de QuickSight (datasets, visualizaciones, campos calculados, filtros y observaciones) se encuentra en:

```
docs/Analisis_Dashboard_SLA_Calculator.md
```

## DynamoDB — Configuración de proyectos y equipos

La aplicación usa DynamoDB para almacenar la configuración de proyectos, equipos y niveles de soporte. Esto permite modificar calendarios SLA, reglas de SLA y mapeos de agentes sin tocar el código.

### Tablas

| Tabla | Descripción |
|---|---|
| `sla-reporter-projects` | Proyectos/clientes con su calendario SLA y reglas de cumplimiento |
| `sla-reporter-teams` | Equipos con los IDs de agentes que los componen (incluye gerencias, áreas y niveles N1/N2) |

### Autenticación AWS

- **En EC2:** se usa el IAM Instance Profile (`nuv-prod-ai-servicecenterEC2Role`). No se necesitan credenciales en el `.env`. Las credenciales se renuevan automáticamente sin expiración.

**Permisos del rol IAM en EC2:**

El rol `nuv-prod-ai-servicecenterEC2Role` tiene las siguientes políticas:

1. `DinamoDBforslas` - Acceso a DynamoDB para leer configuración de proyectos y equipos
2. `SLAExporterS3Glue` - Acceso a S3 para subir Parquet y disparar Glue Crawler
3. Política inline para QuickSight:
```json
{
  "Effect": "Allow",
  "Action": [
    "quicksight:CreateIngestion",
    "quicksight:DescribeIngestion"
  ],
  "Resource": [
    "arn:aws:quicksight:us-east-1:874641912777:dataset/*/*"
  ]
}
```

### Estructura de un proyecto en DynamoDB

```json
{
  "id": "1",
  "empresa": "Policía Nacional",
  "calendar_type": "24x7",
  "active": true,
  "sla_targets": {
    "incidente": {
      "critico":  { "firstResponse": 1,  "resolution": 28  },
      "alto":     { "firstResponse": 2,  "resolution": 44  },
      "medio":    { "firstResponse": 4,  "resolution": 56  },
      "bajo":     { "firstResponse": 8,  "resolution": 80  },
      "planeado": { "firstResponse": 8,  "resolution": 176 }
    },
    "requerimiento": {
      "critico":  { "firstResponse": 1,  "resolution": 28  },
      "alto":     { "firstResponse": 2,  "resolution": 44  },
      "medio":    { "firstResponse": 4,  "resolution": 56  },
      "bajo":     { "firstResponse": 8,  "resolution": 80  },
      "planeado": { "firstResponse": 8,  "resolution": 176 }
    },
    "default": { "firstResponse": 4, "resolution": 56 }
  }
}
```

> Los tiempos en `sla_targets` están en **horas laborales**. El sistema los multiplica x60 internamente para convertirlos a minutos.

### Cómo funciona por ticket

Cuando se procesa un ticket, el sistema:
1. Busca el proyecto del ticket en DynamoDB (`projectsMap[bld_cliente_padre]`)
2. Usa `calendar_type` del proyecto para calcular las horas laborales (no el selector global del frontend)
3. Usa `sla_targets` del proyecto para evaluar el cumplimiento SLA

Si el proyecto no existe en DynamoDB, hace fallback a los valores hardcodeados en `slaService.js`.


### Equipos (teams)

Los equipos se cargan con el script `seed-teams-from-csv.js` a partir de la Matriz de Comunicaciones (CSV con columnas GERENCIA, AREA, EMAIL, STATUS).

```bash
cd /home/ec2-user/slascalculator/backend
node scripts/seed-teams-from-csv.js ruta/al/archivo.csv
```

Carga automáticamente equipos de tipo `gerencia` (ID: `gerencia-{slug}`) y `area` (ID: `area-{slug}`), excluyendo ex-empleados.

Un agente puede pertenecer a múltiples equipos (su área y su gerencia). El filtro por equipo en el frontend usa los `agent_ids` del equipo directamente para manejar esto correctamente.

### Niveles de soporte (N1 / N2)

Los niveles de soporte se definen en `backend/scripts/support-levels.json` y se cargan a DynamoDB como registros de tipo `level` en la tabla `sla-reporter-teams`.

```bash
cd /home/ec2-user/slascalculator/backend
node scripts/seed-support-levels.js
```

Esto crea los registros `level-n1` y `level-n2` con los `agent_ids` resueltos a partir de los emails en `support-levels.json`. El `levelService.js` usa estos registros para calcular métricas de atención por nivel, tasas de escalamiento y tiempos promedio.

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DB_HOST` | Host de PostgreSQL (Zammad) | `xxx.rds.amazonaws.com` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base de datos | `postgres` |
| `DB_USER` | Usuario de la base de datos | `cloud` |
| `DB_PASSWORD` | Contraseña de la base de datos | `****` |
| `PORT` | Puerto del servidor | `443` (producción) / `3000` (desarrollo local) |
| `TIMEZONE` | Zona horaria del servidor | `America/Bogota` |
| `CORS_ORIGIN` | Dominios permitidos para CORS (separar con coma) | `*` |
| `SERVE_FRONTEND` | Servir frontend desde Express (`false` si está en S3) | `true` |
| `AWS_S3_BUCKET` | Bucket S3 para Parquet (pipeline) | `zammad-sla-reporter-prod-874641912777` |
| `AWS_S3_PREFIX` | Prefijo S3 de los datos | `sla-data` |
| `AWS_REGION` | Región AWS | `us-east-1` |
| `AWS_GLUE_CRAWLER_NAME` | Nombre del Glue Crawler | `zammad-sla-reporter-crawler-latest-prod` |
| `AWS_QUICKSIGHT_DATASET_ID` | ID(s) de dataset QuickSight (separar con coma) | `ae663899-2bc4-...` |
| `AWS_ACCOUNT_ID` | ID de cuenta AWS | `874641912777` |
| `DYNAMO_PROJECTS_TABLE` | Tabla DynamoDB de proyectos | `sla-reporter-projects` |
| `DYNAMO_TEAMS_TABLE` | Tabla DynamoDB de equipos | `sla-reporter-teams` |

**Nota sobre autenticación AWS:**
- En EC2: Se usa el IAM Instance Profile (`nuv-prod-ai-servicecenterEC2Role`) automáticamente. No se necesitan credenciales en el `.env`.
- En local: Se requieren credenciales válidas en `~/.aws/credentials` o variables de entorno `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` (para SSO).

## Documentación adicional

| Documento | Descripción |
|---|---|
| `DATABASE_DICTIONARY.md` | Diccionario completo de la base de datos de Zammad (124 tablas) |
| `docs/Analisis_Dashboard_SLA_Calculator.md` | Análisis del dashboard de QuickSight (datasets, campos calculados, filtros) |
| `frontend/src/components/README_COMPONENTS.md` | Documentación de componentes React |
| `docs/diagrams/` | Diagramas de arquitectura en formato .drawio |

## Repositorio

```
https://github.com/ai-scm/slascalculator.git
```

---

## Cambios Realizados por el Semillero

### Lina Rubio

#### 1. Filtro Incidente por Defecto y Filtros en Niveles

Se modificó el panel de filtros para que el tipo "Incidente" esté seleccionado por defecto, y el apartado de niveles de soporte también se vea afectado por los filtros aplicados.

**Archivos modificados:**
- `frontend/src/components/filters/FilterPanel.jsx`
- `frontend/src/components/charts/SupportLevelsView.jsx`
- `backend/services/levelService.js`

**Implementación:**
```javascript
// FilterPanel.jsx - Valor por defecto
const [selectedType, setSelectedType] = useState('Incidente');

// SupportLevelsView.jsx - Filtros aplicados
const apiFilters = {
  startDate: filters.startDate,
  endDate: filters.endDate,
  type: filters.type || 'Incidente'  // Por defecto Incidente
};
```

#### 2. Top Organizaciones en Lugar de Top Agentes

Se modificó la vista de niveles de soporte para mostrar "Top organizaciones atendidas por Nivel 2" en lugar de "Top agentes que escalaron tickets".

**Archivos modificados:**
- `backend/services/levelService.js`
- `frontend/src/components/charts/SupportLevelsView.jsx`

**Implementación:**
```javascript
// Backend - Conteo por organización
const organizationsN2 = {};
for (const ticket of tickets) {
  const currentLevel = agentToLevel[ticket.owner_id];
  if (currentLevel === 'n2') {
    const orgName = ticket.organization_name || 'Sin Organización';
    organizationsN2[orgName] = (organizationsN2[orgName] || 0) + 1;
  }
}

// Frontend - Tabla con paginación
<Table>
  <thead>
    <tr>
      <th>#</th>
      <th>Organización</th>
      <th>Tickets</th>
      <th>Porcentaje</th>
      <th>Distribución</th>
    </tr>
  </thead>
  ...
</Table>
```

#### 3. KPI de Tiempo de Resolución

Se modificó el KPI de tiempo de resolución para que solo cuente los tickets que:
1. Estén cerrados
2. Hayan cumplido el tiempo SLA de resolución

**Archivos modificados:**
- `backend/services/slaService.js`

**Implementación:**
```javascript
// Filtrar solo tickets cerrados que cumplieron SLA
const resolvedOnTime = tickets.filter(ticket => {
  return ticket.close_at &&  // Solo cerrados
         ticket.resolution_sla_met === true;  // Que cumplieron SLA
});

// Calcular tiempo promedio solo de estos tickets
const resolutionTimes = resolvedOnTime
  .map(t => t.resolution_time_minutes)
  .filter(t => t > 0);

const avgResolutionTime = resolutionTimes.length > 0
  ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
  : 0;
```

### Eduardo León

#### 1. Limpieza de Datos para DynamoDB

Se limpió y estructuró correctamente la información en DynamoDB para incluir los datos de N1 y N2 para todos los usuarios de la base de datos.

**Archivos modificados:**
- `backend/scripts/seed-dynamo.js`
- `backend/services/dynamoService.js`

**Implementación:**
```javascript
// seed-dynamo.js - Incluir todos los agentes N1 y N2
const teams = [
  { id: 'level-n1', name: 'Nivel 1', agent_ids: allN1AgentIds },
  { id: 'level-n2', name: 'Nivel 2', agent_ids: allN2AgentIds },
  // ... otros equipos
];

// dynamoService.js - Validación defensiva
if (team && Array.isArray(team.agent_ids) && team.agent_ids.length > 0) {
  teamAgentIds = team.agent_ids.map(id => Number(id)).filter(id => !isNaN(id));
}
```

#### 2. Exportación de Excel con Datos de Niveles

Se modificó la exportación del Excel para que también incluya los datos del apartado de niveles.

**Archivos modificados:**
- `backend/services/excelService.js`

**Implementación:**
```javascript
// excelService.js - Agregar sheet de niveles
const levelsData = await levelService.getSummary({ startDate, endDate });
workbook.addSheet('Niveles', [
  { A: 'Métrica', B: 'Valor' },
  { A: 'Total Tickets', B: levelsData.totalTickets },
  { A: 'Tickets N1', B: levelsData.byLevel.n1.handled },
  { A: 'Tickets N2', B: levelsData.byLevel.n2.handled },
  { A: 'Tasa de Escalamiento', B: levelsData.escalation.escalationRate },
  // ... más métricas
]);
```

#### 3. Exportación de DynamoDB con Todos los N1 y N2

Se modificó el script de exportación de DynamoDB para incluir todos los agentes de N1 y N2, no solo un subconjunto.

**Archivos modificados:**
- `backend/scripts/seed-dynamo.js`

**Implementación:**
```javascript
// Obtener TODOS los agentes de la base de datos
const allUsers = await pool.query('SELECT id FROM users WHERE active = true');
const allN1AgentIds = [];
const allN2AgentIds = [];

// Clasificar cada usuario según su nivel
for (const user of allUsers.rows) {
  const level = agentToLevel[user.id];
  if (level === 'n1') allN1AgentIds.push(user.id);
  else if (level === 'n2') allN2AgentIds.push(user.id);
}
```

---

## Resumen de Cambios por Autor

| Autor | Cambios |
|-------|---------|
| **Lina Rubio** | Filtro Incidente por defecto, filtros en niveles, Top Organizaciones en lugar de Top Agentes, KPI tiempo resolución solo tickets cerrados |
| **Eduardo León** | Limpieza de datos DynamoDB, exportación Excel con datos de niveles, inclusión de todos los N1/N2 en DynamoDB |