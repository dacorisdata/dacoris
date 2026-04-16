# DACORIS

A full-stack application with Next.js frontend and Python FastAPI backend.

## Project Structure

```
dacoris/
├── frontend/          # Next.js application (JavaScript + MUI)
├── backend/           # Python FastAPI application
└── README.md
```

## Frontend Setup

The frontend is built with:
- Next.js 15 (JavaScript)
- Material-UI (MUI)
- React 19

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Backend Setup

The backend is built with:
- Python FastAPI
- Uvicorn server
- PostgreSQL database
- SQLAlchemy ORM (async)
- Alembic for migrations
- CORS middleware enabled

### Prerequisites

- PostgreSQL installed and running
- Python 3.10+

### Running the Backend

1. Create a virtual environment:
```bash
cd backend
python -m venv venv
```

2. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- Linux/Mac: `source venv/bin/activate`

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file (copy from `.env.example`):
```bash
copy .env.example .env
```

5. Update the `.env` file with your PostgreSQL credentials:
```env
DATABASE_URL="postgresql+asyncpg://username:password@localhost:5432/dacoris"
```

6. Run the server (tables will be created automatically on startup):
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

## Development

### Frontend Development
- Main page: `frontend/app/page.js`
- Layout: `frontend/app/layout.js`
- Styles: `frontend/app/globals.css`

### Backend Development
- Main API: `backend/main.py`
- Database models: `backend/models.py`
- Database utilities: `backend/database.py`
- Add new routes and endpoints as needed

### Database Schema

The `models.py` file includes a sample `User` model using SQLAlchemy. To add new models:
1. Define your model class in `models.py`
2. Restart the server (tables will be created automatically)
3. For production, use Alembic for proper migrations:
```bash
alembic init alembic
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## API Endpoints

- `GET /` - Root endpoint
- `GET /api/health` - Health check endpoint (includes database status)
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user (body: `{"email": "user@example.com", "name": "John Doe"}`)

## Next Steps

1. Start both servers (frontend and backend)
2. Visit `http://localhost:3000` to see the application
3. Build your features!
