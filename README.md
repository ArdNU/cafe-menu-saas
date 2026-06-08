# Cafe Menu SaaS

A simple SaaS web application for cafes to manage their digital menus with QR code integration.
Built with React, Express, Node.js, and SQLite.

## Local Development

### 1. Setup Backend
1. `cd backend`
2. `npm install`
3. `npm start` (Runs on port 5000)

### 2. Setup Frontend
1. Open a new terminal.
2. `cd frontend`
3. `npm install`
4. `npm run dev` (Runs on port 5173 usually)

## Deployment on Railway

This project is configured to be easily deployed on [Railway.app](https://railway.app/).

1. **Connect GitHub**: Push this repository to GitHub.
2. **Create Railway Project**: Go to Railway, click "New Project", and select "Deploy from GitHub repo".
3. **Select Repo**: Choose this repository.
4. **Configure Persistent Storage (Important for SQLite & Images)**:
   - By default, Railway's file system is ephemeral. Any uploaded images or database changes will be lost on re-deploy.
   - To fix this, in your Railway project dashboard, go to the Service settings > **Volumes**.
   - Create a new Volume and mount it to the path: `/app/data`
5. **Environment Variables**:
   - Railway will automatically detect the variables from `railway.toml`, but you can set a custom `JWT_SECRET` in the Variables tab for added security.
6. **Deploy**: Railway will use the provided `Dockerfile` to build the frontend and backend together and serve them automatically.
