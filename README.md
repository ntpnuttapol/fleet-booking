# Fleet Booking

Fleet Booking is split into two deploy targets:

- `frontend`: Vite app deployed on Vercel
- `backend`: Express + Prisma API deployed on Render

This setup is recommended for the current project because it keeps the UI and API deploy flows simple, and it fits the PFS Hub SSO handoff model well.

## Project Structure

```text
fleet-booking/
  backend/      Express API + Prisma
  frontend/     Vite frontend
  render.yaml   Render blueprint for backend
  vercel.json   Vercel frontend build settings
```

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Default local URL:

```text
http://localhost:3002
```

### Backend

```bash
cd backend
npm install
npm run dev
```

Default local API URL:

```text
http://localhost:3001
```

## Environment Files

Copy these templates before running locally:

- `frontend/.env.example`
- `backend/.env.example`

## Production

- Frontend domain:
  `https://pfs-bookingcar.vercel.app`
- Hub domain:
  `https://polyfoampfs-hub.vercel.app`

See [DEPLOYMENT.md](/Users/mynutntp/Desktop/fleet-booking/DEPLOYMENT.md) for the full deploy checklist.
