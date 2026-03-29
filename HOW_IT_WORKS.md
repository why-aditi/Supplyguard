# 🕵️ How SupplyGuard AI Works

SupplyGuard AI is a multi-layered platform designed for real-time maritime intelligence and supply chain risk mitigation. This document provides a technical deep-dive into the ingestion, processing, and visualization layers.

---

## 🏗️ System Architecture

The system consists of three primary services orchestrated via **Docker Compose**:

1.  **Frontend (Next.js)**: A real-time dashboard built with D3.js for graph visualization and WebSockets for live state updates.
2.  **Backend (Node.js)**: The central transition layer that manages session state, hosts the **Neo4j Cypher Engine**, and handles WebSocket broadcasting.
3.  **Graph Database (Neo4j Aura)**: The primary persistent storage for the supply chain graph, relationships, and live risk scores.
4.  **ML Service (Python/FastAPI)**: A specialized service for NLP-driven disruption classification.


---

## 📡 1. Data Ingestion Layer

SupplyGuard monitors two primary data streams to detect potential disruptions:

### 🚢 Maritime Intelligence (AIS Stream)
- The server connects to **AISStream.io** via a high-speed WebSocket.
- We monitor **12 critical global port zones** (lat/long bounding boxes).
- **Congestion Detection**: If multiple vessels (especially tankers/cargo ships) drop below 1.0 knots within a port zone for an extended period, the system flags a "Port Delay" disruption.

### 📰 Global News Ingestion (RSS)
- A background worker polls global feeds (Reuters, BBC, Maritime Executive) every 10 minutes.
- New articles are sent to the **ML Service** for classification.

---

## 🧠 2. Intelligence Layer (ML Service)

This layer transforms raw data into actionable risk scores.

### 🏷️ NLP Classification (DistilBERT)
- We use a fine-tuned **DistilBERT** model (transformers library) to categorize news into four primary disruption types:
    - `port_delay`, `weather_event`, `supplier_failure`, `geopolitical`.
- **Confidence Threshold**: A configurable threshold (default 0.55) filters out noise and irrelevant news.
- **Severity Estimation**: The model calculates a severity score ($0.0 - 1.0$) based on the classification confidence and the disruption type.

### 📊 Graph-based Risk Propagation (Neo4j Cypher)
- The supply chain is modeled in **Neo4j** as a complex graph of interconnected nodes.
- **Cypher-powered Propagation**: When a node is disrupted, the backend executes a recursive Cypher query that traverses all downstream paths up to 6 hops away.
- **Max-Risk Path Finding**: Unlike a simple BFS, the Neo4j engine calculates the impact across multiple converging paths. It identifies the "Highest Risk Path" for each affected node to ensure conservative risk estimation ($Risk_{target} = \max(Risk_{path1}, Risk_{path2}, \dots)$).
- **Decay Factor ($0.7$)**: Risk score impact diminishes with distance from the source: $Severity \times 0.7^{depth}$.


---

## 🛣️ 3. AI-Driven Rerouting

Once a disruption is confirmed, the system generates mitigation strategies:

- **Prompt Engineering**: The system constructs a detailed prompt containing:
    1.  The primary disruption details (type, location, severity).
    2.  The list of affected downstream nodes (from the BFS engine).
    3.  Pre-computed alternate routes (edges not affected by the disruption).
- **LLM Orchestration**: The system attempts to use **Gemini 2.0 Flash** for its 1M+ context window and low latency. It falls back to **Groq (Llama 3.3 70B)** if Gemini is unavailable.
- **Output**: Returns exactly 3 ranked recommendations with cost delta, lead time impact, and risk reduction percentages.

---

## 📺 4. Real-time Visualization

The frontend provides a "Living Map" of the supply chain:

- **D3.js Force-Simulation**: Nodes are positioned using a force-directed layout, where "Criticality" (node degree) determines visual scale.
- **WebSocket Synchronization**:
    - **Risk Ripples**: When risk propagates, the server broadcasts updates one-by-one with a small delay ($400ms$ per hop), creating a visual "ripple effect" on the map.
    - **Vessel Tracking**: Live vessel movements are rendered as tiny dots moving across the maritime routes.
- **Interactive Simulation**: Users can manually trigger disruptions at any node to test "What-If" scenarios and see the cascading impact in real-time.

---

## 🛠️ Tech Stack Technicalities

- **Communication**: REST API for static data, WebSockets (`ws` library) for live state.
- **State Management**: **Zustand** on the client for lightweight, high-performance graph state synchronization.
- **Persistence**: 
    - **Neo4j Aura**: Stores the persistent supply chain graph and live risks.
    - **Redis**: Stores high-frequency AIS vessel positions.
    - **PostgreSQL**: Stores historical disruption events and long-term analytics.

- **Model Storage**: **Git LFS** tracks the 250MB+ weights for the DistilBERT model.
