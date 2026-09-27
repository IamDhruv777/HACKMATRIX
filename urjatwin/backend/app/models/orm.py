"""
SQLAlchemy ORM models for UrjaTwin persistence layer.
"""
from sqlalchemy import Column, String, Float, JSON, DateTime, Text
from sqlalchemy.sql import func

from app.models.database import Base


class Scenario(Base):
    """Pre-defined simulation scenario configurations."""
    __tablename__ = "scenarios"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    config_json = Column(JSON, nullable=False)


class Run(Base):
    """
    A simulation run record.
    status: queued | running | completed | failed
    """
    __tablename__ = "runs"

    id = Column(String, primary_key=True)
    scenario_id = Column(String, nullable=False)
    status = Column(String, default="queued", nullable=False)
    progress = Column(Float, default=0.0)
    config_json = Column(JSON)          # scenario config + overrides used for this run
    result_json = Column(JSON)          # full simulation results (frozen at run time)
    error = Column(Text)                # traceback if status == failed
    created_at = Column(DateTime, server_default=func.now())


class Dataset(Base):
    """Metadata for imported or generated datasets."""
    __tablename__ = "datasets"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    row_count = Column(Float)
    provenance = Column(String)          # 'synthetic_demo_v1' | 'imported'
    created_at = Column(DateTime, server_default=func.now())


class Setting(Base):
    """
    Key-value store for user-configurable simulation parameters.
    Values are stored as strings and cast on read.
    """
    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)
