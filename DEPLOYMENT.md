# Deployment Guide

This project is deployed as two separate services.

## 1. Frontend on Vercel

Use:

- Repo: `ntpnuttapol/fleet-booking`
- Root Directory: `frontend`
- Framework: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Required environment variables:

```text
VITE_HUB_URL=https://polyfoampfs-hub.vercel.app
VITE_API_BASE_URL=https://fleet-booking-app.onrender.com
```

After deploy, confirm:

- The login page loads on the Vercel domain
- The page shows `Sign in with PFS Portal Hub`
- SSO redirects back with `sso_token` and `hub_origin`

## 2. Backend on Render

Use:

- Repo: `ntpnuttapol/fleet-booking`
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

You can import the backend service from [render.yaml](/Users/mynutntp/Desktop/fleet-booking/render.yaml).

Required environment variables:

```text
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=your-secure-secret
HUB_URL=https://polyfoampfs-hub.vercel.app
SSO_SYSTEM_ID=booking
```

Optional environment variables:

```text
APP_URL=https://pfs-bookingcar.vercel.app
RESEND_API_KEY=re_xxx
LINE_NOTIFY_TOKEN=xxx
PORT=3001
```

After deploy, confirm:

- `GET /health` returns `200`
- `POST /api/users/sso` no longer returns `404`
- Local login still works
- Hub SSO can auto-provision a user

## 3. PFS Portal

The Hub portal card should point to:

```text
https://pfs-bookingcar.vercel.app
```

The SSO system id for Car Booking is:

```text
booking
```

Make sure the target user has the `booking` system role in PFS Portal admin.

## 4. End-to-End Test

1. Login to PFS Portal
2. Click `Car Booking`
3. Confirm the app redirects to the Vercel frontend
4. Confirm the frontend sends `sso_token` to the Render backend
5. Confirm the backend validates against PFS Hub
6. Confirm the user lands inside Fleet Booking

## Common Issues

### Frontend shows `Unexpected token '<'`

Cause:

- Backend returned an HTML error page instead of JSON

Usually means:

- Render backend is still on an old deploy
- `/api/users/sso` route is missing
- `VITE_API_BASE_URL` points to the wrong backend

### Hub opens the wrong booking URL

Cause:

- PFS Portal still points to the old Vercel domain

Fix:

- Redeploy `PFS-Portal` after updating the Car Booking URL

### Access denied for this system

Cause:

- The user does not have the `booking` role in PFS Portal

Fix:

- Grant `booking` access in Hub admin
