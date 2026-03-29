"""
SupplyGuard AI — DistilBERT Model Inference
Loads the fine-tuned model for production inference.
Falls back to keyword classifier if model files not found.
"""

import json
import os
from pathlib import Path
from typing import Optional


class DistilBertClassifier:
    """
    Fine-tuned DistilBERT disruption classifier.
    Load from a directory containing the saved model, tokenizer, and label_config.json.
    """

    def __init__(self, model_path: str, confidence_threshold: float = 0.55):
        import torch
        from transformers import DistilBertForSequenceClassification, DistilBertTokenizerFast

        self.confidence_threshold = confidence_threshold
        self.model_path = Path(model_path)
        self._torch = torch
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        # Load label config
        config_path = self.model_path / "label_config.json"
        if not config_path.exists():
            raise FileNotFoundError(f"label_config.json not found at {config_path}")

        with open(config_path) as f:
            config = json.load(f)
        self.labels = config["labels"]
        self.id2label = {int(k): v for k, v in config["id2label"].items()}

        # Load tokenizer + model
        print(f"Loading DistilBERT model from {self.model_path}...")
        self.tokenizer = DistilBertTokenizerFast.from_pretrained(str(self.model_path))
        self.model = DistilBertForSequenceClassification.from_pretrained(
            str(self.model_path)
        ).to(self.device)
        self.model.eval()
        print(f"Model loaded on {self.device} — {len(self.labels)} classes")

    def classify(self, title: str, body: str = "") -> dict:
        """Classify a single article."""
        text = f"{title}. {body}" if body else title

        inputs = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=256,
            return_tensors="pt",
        ).to(self.device)

        torch = self._torch
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)[0]

        # Get top prediction
        top_idx = torch.argmax(probs).item()
        confidence = probs[top_idx].item()
        disruption_type = self.id2label[top_idx]

        # Apply confidence threshold
        if confidence < self.confidence_threshold:
            return {
                "disruption_type": "none",
                "severity": 0.0,
                "location": None,
                "confidence": round(confidence, 4),
            }

        # Estimate severity from confidence + type-based ranges
        severity = self._estimate_severity(disruption_type, confidence)

        return {
            "disruption_type": disruption_type,
            "severity": round(severity, 3),
            "location": None,  # Location extraction handled separately
            "confidence": round(confidence, 4),
        }

    def _estimate_severity(self, dtype: str, confidence: float) -> float:
        """Map disruption type + confidence to a severity score."""
        severity_ranges = {
            "port_delay": (0.6, 0.9),
            "weather_event": (0.7, 0.95),
            "supplier_failure": (0.8, 1.0),
            "geopolitical": (0.75, 0.95),
            "transport_strike": (0.6, 0.85),
            "customs_delay": (0.4, 0.6),
            "none": (0.0, 0.0),
        }
        smin, smax = severity_ranges.get(dtype, (0.5, 0.8))
        # Scale by confidence (higher confidence = higher severity)
        t = min(1.0, (confidence - 0.5) / 0.45)  # normalize 0.5-0.95 to 0-1
        return smin + (smax - smin) * t


def load_classifier(model_dir: str, confidence_threshold: float = 0.55):
    """
    Try to load the fine-tuned DistilBERT model.
    Falls back to keyword classifier if model not found.
    """
    model_path = Path(model_dir) / "final"
    
    if not model_path.exists():
        # Try the directory itself (no /final subdirectory)
        model_path = Path(model_dir)
    
    has_config = (model_path / "label_config.json").exists()
    has_weights = (model_path / "model.safetensors").exists() or (model_path / "pytorch_model.bin").exists()

    if has_config and has_weights:
        print(f"[OK] Loading fine-tuned DistilBERT from {model_path}")
        return DistilBertClassifier(str(model_path), confidence_threshold)
    else:
        if has_config and not has_weights:
            print(f"[WARN] label_config.json found but no model weights at {model_path}")
            print("   Run the training script first to generate model weights.")
        else:
            print(f"[WARN] No fine-tuned model found at {model_dir}")
        print("   Using keyword fallback classifier instead.")
        print(f"   To train: python ml/classifier/train.py --data_path data/training/disruptions.csv")
        from .keyword_classifier import KeywordClassifier
        return KeywordClassifier(confidence_threshold)
