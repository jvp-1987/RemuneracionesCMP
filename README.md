# Remuneraciones Salud CMP 🏥

Sistema integral de gestión de remuneraciones y auditoría preventiva para la Atención Primaria de Salud (APS).

## Características principales

- **Gestión de Funcionarios**: Carga masiva con motor de normalización de centros de salud.
- **Auditoría Preventiva**: Sistema de previsualización "Consultar antes de realizar" para integridades de datos.
- **Consolidados**: Gestión de horas extras, viáticos, turnos de urgencia y atrasos.
- **Dashboard Bento**: Visualización premium de indicadores de gestión y puntos de certificación.

## Estructura del Proyecto

- `backend/`: API construida con NestJS, Prisma y PostgreSQL.
- `frontend/`: Aplicación web moderna con Next.js, TailwindCSS y Framer Motion.

## Configuración Local

### Requisitos
- Node.js (v18+)
- PostgreSQL
- NPM / Yarn

### Backend
1. `cd backend`
2. `npm install`
3. Configurar `.env` con `DATABASE_URL`
4. `npx prisma migrate dev`
5. `npm run start:dev`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

---
Desarrollado para la gestión eficiente del capital humano en salud.
