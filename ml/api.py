"""
SupplyGuard AI — Python ML Service
FastAPI endpoints for NLP classification and graph propagation.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import json
import os
from pathlib import Path

from classifier.model import load_classifier
from graph.propagation import GraphPropagationEngine

app = FastAPI(
    title="SupplyGuard ML Service",
    description="NLP disruption classification + graph propagation engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load seed data ───────────────────────────────────
SEED_PATH = Path(__file__).parent.parent / "data" / "seed" / "graph-seed.json"
with open(SEED_PATH) as f:
    seed_data = json.load(f)

# ── Initialize engines ──────────────────────────────
MODEL_DIR = os.environ.get("HF_MODEL_PATH", str(Path(__file__).parent / "models" / "distilbert-disruption-v1"))
classifier = load_classifier(MODEL_DIR)
graph_engine = GraphPropagationEngine(seed_data)


# ── Request/Response Models ─────────────────────────
class ClassifyRequest(BaseModel):
    title: str
    body: str = ""


class ClassifyResponse(BaseModel):
    disruption_type: str
    severity: float = Field(ge=0.0, le=1.0)
    location: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)


class BatchClassifyRequest(BaseModel):
    articles: list[ClassifyRequest]


class PropagateRequest(BaseModel):
    node_id: str
    base_risk: float = Field(ge=0.0, le=1.0, default=0.8)
    decay: float = Field(ge=0.0, le=1.0, default=0.7)
    max_depth: int = Field(ge=1, le=10, default=6)


class PropagationResult(BaseModel):
    risk: float
    depth: int


# ── Endpoints ────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "classifier": "keyword_fallback",
        "graph_nodes": graph_engine.node_count,
        "graph_edges": graph_engine.edge_count,
    }


@app.post("/classify", response_model=ClassifyResponse)
async def classify(req: ClassifyRequest):
    """Classify a single article for disruption type."""
    result = classifier.classify(req.title, req.body)
    return ClassifyResponse(**result)


@app.post("/batch-classify")
async def batch_classify(req: BatchClassifyRequest):
    """Classify up to 50 articles."""
    if len(req.articles) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 articles per batch")

    results = []
    for article in req.articles:
        result = classifier.classify(article.title, article.body)
        results.append(result)

    return {"results": results}


@app.post("/propagate")
async def propagate(req: PropagateRequest):
    """Run BFS risk propagation from a disrupted node."""
    if not graph_engine.has_node(req.node_id):
        raise HTTPException(status_code=404, detail=f"Node '{req.node_id}' not found")

    result = graph_engine.propagate_risk(
        req.node_id, req.base_risk, req.decay, req.max_depth
    )
    return {"propagation": result}


@app.get("/score/{node_id}")
async def get_score(node_id: str):
    """Get current risk score for a single node."""
    if not graph_engine.has_node(node_id):
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")

    return {
        "node_id": node_id,
        "risk_score": graph_engine.get_risk(node_id),
    }
