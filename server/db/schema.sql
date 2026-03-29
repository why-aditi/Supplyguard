-- SupplyGuard AI — PostgreSQL Schema
-- Created: 2025-01-15

-- Raw articles from RSS ingestion
CREATE TABLE IF NOT EXISTS articles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url             TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT,
    source          VARCHAR(100) NOT NULL,  -- 'reuters', 'bbc', 'gdelt', 'port_rss', etc.
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    classified      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_articles_fetched ON articles (fetched_at DESC);
CREATE INDEX idx_articles_classified ON articles (classified) WHERE classified = FALSE;

-- Disruption events detected by NLP classifier
CREATE TABLE IF NOT EXISTS disruption_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id      UUID REFERENCES articles(id) ON DELETE SET NULL,
    disruption_type VARCHAR(50) NOT NULL,  -- port_delay, weather_event, supplier_failure, geopolitical, transport_strike, customs_delay
    severity        REAL NOT NULL CHECK (severity >= 0.0 AND severity <= 1.0),
    confidence      REAL NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    location        TEXT,
    affected_node_id TEXT,                  -- maps to graph node id
    resolved        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX idx_disruptions_created ON disruption_events (created_at DESC);
CREATE INDEX idx_disruptions_active ON disruption_events (resolved) WHERE resolved = FALSE;

-- LLM recommendations log
CREATE TABLE IF NOT EXISTS recommendations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disruption_id   UUID REFERENCES disruption_events(id) ON DELETE CASCADE,
    llm_source      VARCHAR(20) NOT NULL,  -- 'gemini' or 'grok'
    rank            SMALLINT NOT NULL,
    route           TEXT NOT NULL,
    reasoning       TEXT,
    cost_delta_pct  REAL,
    lead_time_delta_days REAL,
    risk_reduction_pct   REAL,
    confidence      VARCHAR(10),           -- 'high', 'medium', 'low'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recs_disruption ON recommendations (disruption_id);
