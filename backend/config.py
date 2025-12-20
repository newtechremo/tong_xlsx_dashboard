import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

# Database
DATABASE_PATH = BASE_DIR / "database" / "safety.db"

# Data repository
DATA_REPOSITORY = PROJECT_ROOT / "data_repository"
ATTENDANCE_DIR = DATA_REPOSITORY / "01_attendance"
RISK_ASSESSMENT_DIR = DATA_REPOSITORY / "02_risk_assessment"
TBM_DIR = DATA_REPOSITORY / "03_tbm"

# API settings
API_PREFIX = "/api"
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://172.20.231.119:3000",
    "http://172.20.231.119:5173",
    "*",  # Allow all origins for development
]
