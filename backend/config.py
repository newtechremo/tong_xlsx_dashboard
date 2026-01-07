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
API_PORT = 3002
CORS_ORIGINS = [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://172.20.231.119:3001",
    "*",  # Allow all origins for development
]
