"""
SupplyGuard AI — DistilBERT Fine-Tuning Script
Run on Google Colab (free T4 GPU) or locally with a CUDA GPU.

Usage:
  # On Colab: upload this file + data/training/disruptions.csv
  python train.py --data_path ./disruptions.csv --output_dir ./model-output
  
  # Locally:
  cd ml/classifier
  python train.py --data_path ../../data/training/disruptions.csv --output_dir ../models/distilbert-disruption-v1

Expected training time: ~20-30 minutes on a T4 GPU, ~5 min on an A100.
"""

import argparse
import os
import json
import csv
import numpy as np
from pathlib import Path

import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    DistilBertTokenizerFast,
    DistilBertForSequenceClassification,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback,
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, f1_score, accuracy_score


# ── Label mapping ────────────────────────────────────
LABELS = [
    "port_delay",
    "weather_event",
    "supplier_failure",
    "geopolitical",
    "transport_strike",
    "customs_delay",
    "none",
]
LABEL2ID = {label: i for i, label in enumerate(LABELS)}
ID2LABEL = {i: label for i, label in enumerate(LABELS)}


# ── Dataset ──────────────────────────────────────────
class DisruptionDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length=256):
        self.encodings = tokenizer(
            texts,
            truncation=True,
            padding="max_length",
            max_length=max_length,
            return_tensors="pt",
        )
        self.labels = torch.tensor(labels, dtype=torch.long)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        item = {key: val[idx] for key, val in self.encodings.items()}
        item["labels"] = self.labels[idx]
        return item


# ── Data loading ─────────────────────────────────────
def load_training_data(csv_path):
    """Load CSV with columns: headline, body, label"""
    texts = []
    labels = []
    
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            headline = row.get("headline", "").strip()
            body = row.get("body", "").strip()
            label = row.get("label", "none").strip()
            
            if not headline or label not in LABEL2ID:
                continue
            
            # Combine headline + body (truncated to ~256 tokens by tokenizer)
            text = f"{headline}. {body}" if body else headline
            texts.append(text)
            labels.append(LABEL2ID[label])
    
    print(f"Loaded {len(texts)} samples from {csv_path}")
    
    # Print class distribution
    from collections import Counter
    dist = Counter(labels)
    for label_id, count in sorted(dist.items()):
        print(f"  {ID2LABEL[label_id]:20s}: {count}")
    
    return texts, labels


# ── Metrics ──────────────────────────────────────────
def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    preds = np.argmax(predictions, axis=-1)
    f1 = f1_score(labels, preds, average="weighted")
    acc = accuracy_score(labels, preds)
    return {"f1": f1, "accuracy": acc}


# ── Main training function ───────────────────────────
def train(data_path, output_dir, epochs=10, batch_size=16, learning_rate=2e-5):
    print("\n🚀 SupplyGuard NLP — DistilBERT Fine-Tuning")
    print("=" * 50)
    
    # Device
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}")
    if device == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    # Load data
    texts, labels = load_training_data(data_path)
    
    # Train/test split (80/20, stratified)
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )
    print(f"\nTrain: {len(train_texts)} samples")
    print(f"Val:   {len(val_texts)} samples")
    
    # Tokenizer
    model_name = "distilbert-base-uncased"
    print(f"\nLoading tokenizer: {model_name}")
    tokenizer = DistilBertTokenizerFast.from_pretrained(model_name)
    
    # Datasets
    train_dataset = DisruptionDataset(train_texts, train_labels, tokenizer)
    val_dataset = DisruptionDataset(val_texts, val_labels, tokenizer)
    
    # Model
    print(f"Loading model: {model_name}")
    model = DistilBertForSequenceClassification.from_pretrained(
        model_name,
        num_labels=len(LABELS),
        id2label=ID2LABEL,
        label2id=LABEL2ID,
    )
    
    # Training args
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=learning_rate,
        weight_decay=0.01,
        warmup_ratio=0.1,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        greater_is_better=True,
        logging_steps=10,
        save_total_limit=2,
        fp16=torch.cuda.is_available(),  # Mixed precision on GPU
        report_to="none",  # Disable wandb/tensorboard
        seed=42,
    )
    
    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
    )
    
    # Train
    print(f"\n🏋️ Training for up to {epochs} epochs...")
    print("-" * 50)
    trainer.train()
    
    # Evaluate
    print("\n📊 Final Evaluation:")
    print("-" * 50)
    eval_results = trainer.evaluate()
    print(f"  F1 Score:  {eval_results['eval_f1']:.4f}")
    print(f"  Accuracy:  {eval_results['eval_accuracy']:.4f}")
    
    # Detailed classification report
    predictions = trainer.predict(val_dataset)
    preds = np.argmax(predictions.predictions, axis=-1)
    report = classification_report(
        val_labels, preds, target_names=LABELS, digits=3
    )
    print(f"\n{report}")
    
    # Save model + tokenizer
    final_dir = os.path.join(output_dir, "final")
    print(f"\n💾 Saving model to {final_dir}")
    trainer.save_model(final_dir)
    tokenizer.save_pretrained(final_dir)
    
    # Save label mapping
    with open(os.path.join(final_dir, "label_config.json"), "w") as f:
        json.dump({"labels": LABELS, "label2id": LABEL2ID, "id2label": ID2LABEL}, f, indent=2)
    
    print(f"\n✅ Training complete! Model saved to: {final_dir}")
    print(f"   Copy this directory to: ml/models/distilbert-disruption-v1/")
    
    return eval_results


# ── CLI ──────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune DistilBERT for supply chain disruption classification")
    parser.add_argument("--data_path", type=str, default="../../data/training/disruptions.csv",
                        help="Path to the training CSV file")
    parser.add_argument("--output_dir", type=str, default="../models/distilbert-disruption-v1",
                        help="Directory to save the fine-tuned model")
    parser.add_argument("--epochs", type=int, default=10, help="Max training epochs (early stopping enabled)")
    parser.add_argument("--batch_size", type=int, default=16, help="Training batch size")
    parser.add_argument("--lr", type=float, default=2e-5, help="Learning rate")
    
    args = parser.parse_args()
    train(args.data_path, args.output_dir, args.epochs, args.batch_size, args.lr)
