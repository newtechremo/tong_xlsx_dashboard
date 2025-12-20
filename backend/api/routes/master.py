"""
Master data API routes (sites, partners)
"""

import sqlite3
from typing import List
from fastapi import APIRouter, HTTPException

from backend.config import DATABASE_PATH
from backend.api.schemas.common import SiteResponse, PartnerResponse

router = APIRouter()


@router.get("/sites", response_model=List[SiteResponse])
async def get_sites():
    """Get all construction sites."""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id, name FROM sites ORDER BY name")
        return [
            SiteResponse(id=row["id"], name=row["name"])
            for row in cursor.fetchall()
        ]
    finally:
        conn.close()


@router.get("/sites/{site_id}", response_model=SiteResponse)
async def get_site(site_id: int):
    """Get a specific site by ID."""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id, name FROM sites WHERE id = ?", (site_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Site not found")
        return SiteResponse(id=row["id"], name=row["name"])
    finally:
        conn.close()


@router.get("/partners", response_model=List[PartnerResponse])
async def get_partners():
    """Get all partner companies."""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id, name FROM partners ORDER BY name")
        return [
            PartnerResponse(id=row["id"], name=row["name"])
            for row in cursor.fetchall()
        ]
    finally:
        conn.close()


@router.get("/partners/{partner_id}", response_model=PartnerResponse)
async def get_partner(partner_id: int):
    """Get a specific partner by ID."""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id, name FROM partners WHERE id = ?", (partner_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Partner not found")
        return PartnerResponse(id=row["id"], name=row["name"])
    finally:
        conn.close()
