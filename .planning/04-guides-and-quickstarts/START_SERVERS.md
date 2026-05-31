# How to Start DACORIS Servers

## Backend Server (Required for Research Output Portal)

### Option 1: Start Backend
```powershell
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Option 2: Using Python directly
```powershell
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at: `http://localhost:8000`

## Frontend Server

### Start Frontend (Next.js)
```powershell
cd frontend
npm run dev
```

The frontend will be available at: `http://localhost:3000`

## Verify Backend is Running

Test the API:
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/public/works/stats" -Method GET
```

## Check if Data Exists

If you get an error about no data, run the seeder:
```powershell
cd backend
python seed_scholarly_works.py
```

## Full Startup Sequence

1. **Start Backend** (Terminal 1):
   ```powershell
   cd c:\projects\dacoris\backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start Frontend** (Terminal 2):
   ```powershell
   cd c:\projects\dacoris\frontend
   npm run dev
   ```

3. **Visit the Research Output Portal**:
   - Open browser to `http://localhost:3000/research-output`
   - If you see "Failed to load research data", click "Seed Mock Data" button
   - Or run the seed script manually (see above)

## Troubleshooting

### Backend won't start
- Check if port 8000 is already in use
- Make sure you're in the `backend` directory
- Verify Python virtual environment is activated

### Frontend won't start
- Check if port 3000 is already in use
- Run `npm install` if packages are missing
- Clear `.next` folder: `rm -r .next` then restart

### No data showing
- Make sure backend is running first
- Run the seed script: `python seed_scholarly_works.py`
- Check browser console for API errors
- Verify API_URL in frontend matches backend URL

### CORS errors
- Backend CORS is configured for `http://localhost:3000`
- Make sure you're accessing frontend from that exact URL
- Check backend console for CORS-related errors
