# Blend 360 - Reportes SLA para Zammad

Sistema de reportes de Acuerdos de Nivel de Servicio (SLA) para tickets de Zammad. Permite visualizar metricas, cumplimiento de SLA y exportar informes en Excel.

## Requisitos

- Node.js 18+
- Acceso a la base de datos PostgreSQL de Zammad
- VPN corporativa (para acceder a la EC2 y al RDS)

## Estructura del proyecto

```
zammad-sla-reporter/
├── backend/              # API Express (Node.js)
│   ├── server.js         # Servidor principal
│   ├── Dockerfile        # Imagen Docker para despliegue
│   ├── routes/           # Endpoints API
│   ├── services/         # Logica de negocio (SLA, Excel)
│   └── config/           # Base de datos, constantes
├── frontend/             # App React (Vite)
│   ├── src/              # Codigo fuente React
│   ├── public/           # Assets estaticos (logo)
│   └── dist/             # Build de produccion (generado)
├── deploy.sh             # Script de despliegue
└── package.json          # Scripts raiz
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

## Produccion

### Infraestructura

| Componente | Servicio | Detalle |
|-----------|----------|---------|
| Backend + Frontend | EC2 | `10.67.4.151` (IP privada, requiere VPN) |
| Base de datos | RDS PostgreSQL | Base de datos de Zammad (solo lectura) |
| Puerto | 443 | Abierto en Security Group |

### Acceder al servidor

```bash
ssh -i "nuv-prod-ai-servicecenter-informespk 1.pem" ec2-user@10.67.4.151
```

### Desplegar cambios en produccion

**1. Hacer push de los cambios desde tu PC:**
```bash
git add .
git commit -m "descripcion del cambio"
git push
```

**2. Conectarse a la EC2 por SSH y actualizar:**
```bash
ssh -i "nuv-prod-ai-servicecenter-informespk 1.pem" ec2-user@10.67.4.151
```

**3. Si cambiaste el backend:**
```bash
cd /home/ec2-user/slascalculator
git pull
cd backend && npm install
sudo kill $(pgrep -f "node server.js")
sudo nohup node server.js > /home/ec2-user/app.log 2>&1 &
```

**4. Si cambiaste el frontend:**

Primero en tu PC local:
```bash
cd frontend
npm run build
```

Subir el build a la EC2 (desde otra terminal local):
```bash
scp -i "nuv-prod-ai-servicecenter-informespk 1.pem" -r frontend/dist ec2-user@10.67.4.151:/home/ec2-user/slascalculator/frontend/
```

Luego reiniciar el servidor en la EC2:
```bash
sudo kill $(pgrep -f "node server.js")
cd /home/ec2-user/slascalculator/backend
sudo nohup node server.js > /home/ec2-user/app.log 2>&1 &
```

### Ver logs del servidor

```bash
# Logs en tiempo real
tail -f /home/ec2-user/app.log

# Estado del servidor
curl http://localhost:443/api/projects | head -c 100
```

### URL de la aplicacion

```
http://10.67.4.151:443
```
Requiere VPN corporativa activa.

## Endpoint de exportacion para AWS QuickSight

### `POST /api/export/quicksight`

Retorna toda la data de SLA en formato aplanado (sin objetos anidados), listo para ser consumido por una Lambda de AWS y escrito a S3 como CSV para QuickSight.

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

**Tipos de calendario:** `laboral` (L-V 8am-5pm), `24-7` (24 horas), `extended` (todos los dias 8am-10pm)

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
    "by_agent": [
      {
        "agent_name": "Juan Perez",
        "total_tickets": 45,
        "first_response_compliance_rate": "93.33",
        "resolution_compliance_rate": "77.78"
      }
    ],
    "by_organization": [
      {
        "organization_name": "[P2068] UNA - Contrato 4",
        "total_tickets": 30,
        "first_response_compliance_rate": "93.33",
        "resolution_compliance_rate": "73.33"
      }
    ],
    "by_type": [
      { "type_name": "Incidente", "total_tickets": 100, "closed_tickets": 80, "open_tickets": 20 }
    ]
  }
}
```

### Pipeline AWS QuickSight (propuesto)

```
EventBridge (cada 30 min) --> Lambda (fetch + write CSV) --> S3 --> QuickSight SPICE
                                       |
                                       v HTTP POST
                             Backend /api/export/quicksight
```

| Servicio | Costo/mes |
|----------|-----------|
| EventBridge (1,440 invocaciones) | $0.00 (free tier) |
| Lambda (1,440 x 2s x 128MB) | ~$0.04 |
| S3 (storage + PUTs) | ~$0.01 |
| QuickSight Author (1 usuario) | $12-24 |

### Probar en Postman

```
POST http://10.67.4.151:443/api/export/quicksight
Content-Type: application/json

Body: {}
```

## Variables de entorno

| Variable | Descripcion | Ejemplo |
|----------|-------------|---------|
| `DB_HOST` | Host de PostgreSQL (Zammad) | `xxx.rds.amazonaws.com` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base de datos | `postgres` |
| `DB_USER` | Usuario de la base de datos | `cloud` |
| `DB_PASSWORD` | Contrasena de la base de datos | `****` |
| `PORT` | Puerto del servidor | `443` |
| `TIMEZONE` | Zona horaria | `America/Mexico_City` |
| `CORS_ORIGIN` | Dominios permitidos para CORS | `*` |
| `SERVE_FRONTEND` | Servir frontend desde Express | `true` |

## Repositorio

```
https://github.com/mapube16/slascalculator.git
```
