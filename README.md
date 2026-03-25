# AI Data Policy Compliance Agent

An AI-driven solution to ensure data policy compliance, automatically evaluating and reviewing documents against organizational and regulatory policies.

## 🚀 Features
- **Frontend**: Modern Next.js interface for document upload and analysis visualization.
- **Backend**: Python FastAPI engine with SQLAlchemy and NLP processing for policy extraction.

## 📂 Directory Structure
- `frontend/`: Next.js frontend application.
- `backend/`: FastAPI backend with database integration.

## 🛠️ Getting Started

Follow these steps to get the environment up and running properly.

### 1. Prerequisites
- Python 3.10+
- Node.js 20.19+ (Recommended for Next.js 16 Compatibility)
- PostgreSQL database (e.g., Supabase)

### 2. Backend Setup
```bash
cd backend
# Create and activate virtual environment
python -m venv venv
# Activate on macOS/Linux:
source venv/bin/activate
# Activate on Windows (CMD):
venv\Scripts\activate
# Activate on Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Create a .env file with your DATABASE_URL
# example: DATABASE_URL=postgresql://user:pass@host:5432/db
```

**Running the Backend:**
```bash
# From the backend directory
uvicorn app.main:app --reload
```
*Note: The application automatically initializes the database schema on first run.*

### 3. Frontend Setup
```bash
cd frontend
# Install dependencies
npm install

# Configure environment (Optional)
# Create a .env.local file if you need a different API URL
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Running the Frontend:**
```bash
# From the frontend directory
npm run dev
```

### 4. Usage
Once both services are running:
1. Open your browser to [http://localhost:3000](http://localhost:3000).
2. Upload a PDF policy document.
3. Click 'Process' to begin the AI-driven clause analysis.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
