"""
FastAPI Application for HyunJangTong 2.0 Safety Management System

Run with:
    uvicorn backend.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import API_PREFIX, CORS_ORIGINS
from backend.api.routes import master, dashboard, risk, tbm

app = FastAPI(
    title="HyunJangTong 2.0 API",
    description="Construction Site Safety Management API",
    version="1.0.0"
)

# CORS middleware for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(master.router, prefix=API_PREFIX, tags=["Master Data"])
app.include_router(dashboard.router, prefix=f"{API_PREFIX}/dashboard", tags=["Dashboard"])
app.include_router(risk.router, prefix=f"{API_PREFIX}/risk", tags=["Risk Assessment"])
app.include_router(tbm.router, prefix=f"{API_PREFIX}/tbm", tags=["TBM"])


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "HyunJangTong 2.0 API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
