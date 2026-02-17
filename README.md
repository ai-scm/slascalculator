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
