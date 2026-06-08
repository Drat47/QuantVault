# QuantVault

## Project Overview
QuantVault is a full-stack web application designed to help multiple users track, manage, and analyze their investment portfolios efficiently. Each user can securely manage their own investment data, perform CRUD operations, and view visual summaries of their portfolios through dynamic charts.

## Features
- Multi-user authentication system with signup, login, and logout.
- User-specific portfolio management with Create, Read, Update, and Delete (CRUD) operations on investments.
- Search and filter investments by name.
- Interactive portfolio distribution visualization via Pie Charts (Recharts).
- Modern, responsive UI developed using React and TailwindCSS.
- Basic validation and error handling on both frontend and backend.

## Technology Stack
- Backend: Python FastAPI with in-memory storage (for demonstration).
- Frontend: React.js with TailwindCSS.
- Charting: Recharts library.
- Servers: Uvicorn for backend, Vite for frontend.

## Folder Structure

quantvault/
├── backend/
│   ├── main.py                 # FastAPI backend app and endpoints
│   ├── requirements.txt        # Python dependencies
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── api.js              # API utility functions
│   │   ├── App.jsx             # Main React component
│   │   ├── index.css           # Tailwind base CSS imports
│   │   ├── main.jsx            # React app entry point
│   │   └── components/         # React reusable components
│   ├── package.json            # Frontend npm configuration
│   ├── tailwind.config.js      # Tailwind config
│   ├── postcss.config.js       # PostCSS config for Tailwind
│   └── README.md               # Frontend-specific documentation (optional)
└── README.md                   # This overall project documentation


## Getting Started

### Backend Setup

1. Create and activate a Python virtual environment:
   
   python -m venv venv
   source venv/bin/activate  # Linux/macOS
   .\venv\Scripts\activate   # Windows PowerShell
   

2. Install backend dependencies:
   
   pip install -r backend/requirements.txt
   

3. Run the backend server:
   
   uvicorn backend.main:app --reload
   

### Frontend Setup

1. Change to the frontend directory:
   
   cd frontend
   

2. Install frontend dependencies:
   
   npm install
   

3. Start the frontend server:
   
   npm run dev
   

4. Open your browser at:
   
   http://localhost:5173
   

## Usage

- Sign up for a new user account.
- Log in using your credentials.
- Add, edit, delete your portfolio investments.
- Use the search box to find investments quickly.
- View your portfolio investment distribution on the pie chart.
- Log out once finished.

## Troubleshooting

- Receiving **401 Unauthorized** error?  
  After restarting the backend, re-register and log in as tokens do not persist in-memory.

- TailwindCSS styles not showing?  
  Verify Tailwind CSS imports, restart frontend server, and clear browser cache.

- Errors running `npm run dev`?  
  Ensure you run commands in the correct frontend directory where `package.json` exists.

## Future Enhancements

- Persistent database integration (PostgreSQL, MySQL)
- Secure password hashing and JWT authentication
- User profile page and password recovery
- Export/import investments in CSV format
- Pagination or infinite scroll for large portfolios
- Fully responsive and mobile-friendly UI enhancements  

## Deployment

### Backend → Render

1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → **New Web Service** → connect your GitHub repo.
3. Set the following in Render's dashboard:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variable**: `FRONTEND_URL` = your Vercel URL (e.g. `https://quantvault.vercel.app`)
4. Click **Deploy**. Note the service URL (e.g. `https://quantvault-api.onrender.com`).

> ⚠️ Free tier spins down after ~15 min of inactivity. First request after idle may take ~30 seconds.

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo.
2. Set the **Root Directory** to `frontend`.
3. Add an **Environment Variable**:
   - `VITE_API_URL` = your Render backend URL (e.g. `https://quantvault-api.onrender.com`)
4. Click **Deploy**. Vercel auto-detects Vite and runs `npm run build`.

> The `frontend/vercel.json` file ensures React Router's client-side routing works on all pages.

---

## License

MIT License

---

Thank you for using QuantVault!  
Feel free to open issues or contribute via pull requests.
