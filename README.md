# Blend 360 - Reportes SLA para Zammad

Sistema de reportes de Acuerdos de Nivel de Servicio (SLA) para tickets de Zammad. Permite visualizar metricas, cumplimiento de SLA y exportar informes en Excel.

## Requisitos

- Node.js 18+
- Acceso a la base de datos PostgreSQL de Zammad

## Estructura del proyecto

```
zammad-sla-reporter/
├── backend/          # API Express (Node.js)
│   ├── server.js     # Servidor principal
│   ├── routes/       # Endpoints API
│   ├── services/     # Logica de negocio (SLA, Excel)
│   └── config/       # Base de datos, constantes
├── frontend/         # App React (Vite)
│   ├── src/          # Codigo fuente React
│   ├── public/       # Assets estaticos (logo)
│   └── dist/         # Build de produccion (generado)
└── package.json      # Scripts raiz
```

## Desarrollo local

1. Configurar variables de entorno:
```bash
cp .env.example backend/.env
```

Editar `backend/.env`:
```
DB_HOST=<host PostgreSQL>
DB_PORT=5432
DB_NAME=postgres
DB_USER=<usuario>
DB_PASSWORD=<contraseña>
PORT=3000
TIMEZONE=America/Mexico_City
```

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

## Despliegue en produccion (EC2)

1. Clonar e instalar:
```bash
git clone <url-del-repositorio>
cd zammad-sla-reporter
npm run install:all
```

2. Configurar variables de entorno en `backend/.env`

3. Build del frontend:
```bash
npm run build
```

4. Iniciar servidor:
```bash
npm start
```

La aplicacion queda disponible en `http://<ip-del-ec2>:3000`. El servidor Express sirve tanto la API (`/api/*`) como el frontend React desde una sola instancia.

## Variables de entorno

| Variable | Descripcion |
|----------|-------------|
| `DB_HOST` | Host de PostgreSQL (Zammad) |
| `DB_PORT` | Puerto de PostgreSQL (default 5432) |
| `DB_NAME` | Nombre de la base de datos |
| `DB_USER` | Usuario de la base de datos |
| `DB_PASSWORD` | Contraseña de la base de datos |
| `PORT` | Puerto del servidor (default 3000) |
| `TIMEZONE` | Zona horaria (default America/Mexico_City) |
