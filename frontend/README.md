# SupplyPro Frontend

Supply Chain Management System Frontend. Built with React + TypeScript + Vite + Ant Design.

## Environment Requirements

- **Node.js**: >= 18.0.0 (Recommended: v20+)
- **npm**: >= 9.0.0
- **Backend**: Running locally or via Docker on port 8080

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```
   - Access: http://localhost:5173
   - Backend API Proxy: http://localhost:8080

3. **Build for Production**
   ```bash
   npm run build
   ```

## Troubleshooting

### Port Conflicts
If port 5173 is occupied:
- The terminal will show "Port 5173 is in use, trying another one..."
- Check running processes: `lsof -i :5173` (macOS/Linux) or `netstat -ano | findstr :5173` (Windows)

### API Connection Issues
- Ensure Backend is running: `curl -I http://localhost:8080/api/auth/signin`
- Check `vite.config.ts` proxy settings.

## Verification Script
Run the built-in diagnostic script to check your environment:
```bash
node scripts/verify-env.js
```
