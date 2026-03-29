"""
SupplyGuard AI — Keyword-based Disruption Classifier (Fallback)
Used when DistilBERT model is not available (no GPU fine-tuning done yet).
"""

import re
from typing import Optional


# Keyword patterns for each disruption type
DISRUPTION_PATTERNS = {
    "port_delay": {
        "keywords": [
            "port delay", "port congestion", "backlog", "container jam",
            "docking delay", "berth", "anchorage", "queue", "waiting time",
            "vessel queue", "port capacity", "terminal delay", "port shutdown",
            "port closure", "harbor", "wharf",
        ],
        "severity_range": (0.6, 0.9),
    },
    "weather_event": {
        "keywords": [
            "typhoon", "hurricane", "cyclone", "storm", "flood", "flooding",
            "earthquake", "tsunami", "tornado", "blizzard", "extreme weather",
            "heavy rain", "monsoon", "wildfire", "volcanic", "eruption",
            "drought", "ice storm", "heatwave",
        ],
        "severity_range": (0.7, 0.95),
    },
    "supplier_failure": {
        "keywords": [
            "production halt", "factory shutdown", "plant closure", "power outage",
            "supply shortage", "raw material", "component shortage", "chip shortage",
            "semiconductor shortage", "bankruptcy", "insolvency", "recall",
            "quality issue", "contamination", "explosion", "fire at",
            "labor dispute at factory", "fab", "foundry",
        ],
        "severity_range": (0.8, 1.0),
    },
    "geopolitical": {
        "keywords": [
            "sanctions", "tariff", "trade war", "embargo", "red sea",
            "suez canal", "strait of hormuz", "taiwan strait", "blockade",
            "military", "conflict", "war", "attack", "missile",
            "piracy", "seizure", "border closure", "diplomatic",
            "export ban", "import restriction",
        ],
        "severity_range": (0.75, 0.95),
    },
    "transport_strike": {
        "keywords": [
            "strike", "dock workers", "port workers", "walkout",
            "industrial action", "labor dispute", "union", "picket",
            "work stoppage", "truckers strike", "rail strike",
            "pilot strike", "freight strike",
        ],
        "severity_range": (0.6, 0.85),
    },
    "customs_delay": {
        "keywords": [
            "customs", "inspection", "cbp", "border patrol",
            "import duties", "clearance delay", "regulatory",
            "compliance", "quarantine", "phytosanitary",
            "documentation", "certificate", "license",
        ],
        "severity_range": (0.4, 0.6),
    },
}

# Location extraction patterns
LOCATION_PATTERNS = [
    r"(?:at|in|near|off)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
    r"(?:Port of|Strait of|Canal)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
]


class KeywordClassifier:
    """
    Rule-based disruption classifier using keyword matching.
    Serves as a fallback when the fine-tuned DistilBERT model is not available.
    """

    def __init__(self, confidence_threshold: float = 0.55):
        self.confidence_threshold = confidence_threshold

    def classify(self, title: str, body: str = "") -> dict:
        text = f"{title} {body}".lower()
        best_type = "none"
        best_score = 0.0
        best_confidence = 0.0

        for dtype, config in DISRUPTION_PATTERNS.items():
            matches = sum(1 for kw in config["keywords"] if kw in text)
            total_keywords = len(config["keywords"])

            if matches > 0:
                # Confidence based on keyword match density
                confidence = min(0.95, 0.4 + (matches / min(total_keywords, 5)) * 0.55)

                if confidence > best_confidence:
                    best_type = dtype
                    best_confidence = confidence
                    # Severity based on keyword count and range
                    smin, smax = config["severity_range"]
                    severity_t = min(1.0, matches / 3)
                    best_score = smin + (smax - smin) * severity_t

        # Apply confidence threshold
        if best_confidence < self.confidence_threshold:
            return {
                "disruption_type": "none",
                "severity": 0.0,
                "location": None,
                "confidence": best_confidence,
            }

        # Extract location
        location = self._extract_location(f"{title} {body}")

        return {
            "disruption_type": best_type,
            "severity": round(best_score, 3),
            "location": location,
            "confidence": round(best_confidence, 3),
        }

    def _extract_location(self, text: str) -> Optional[str]:
        for pattern in LOCATION_PATTERNS:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return None
