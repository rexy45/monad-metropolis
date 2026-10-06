import os
import json
import time
import numpy as np

print("==================================================")
print("[START] Scam Prevention Engine - Day 1 Setup")
print("==================================================")

print("\n[Step 1/3] Generating synthetic transaction dataset...")
np.random.seed(42)
num_records = 15000

amount = np.clip(np.random.exponential(scale=3000, size=num_records) + 50, 10, 100000)
is_new_payee = np.random.choice([0, 1], size=num_records, p=[0.75, 0.25])
payee_account_age_days = np.random.exponential(scale=120, size=num_records) + 0.1
active_phone_call = np.random.choice([0, 1], size=num_records, p=[0.90, 0.10])
screen_sharing_active = np.random.choice([0, 1], size=num_records, p=[0.96, 0.04])
edge_intent_risk_score = np.random.beta(a=1.5, b=5.0, size=num_records)
graph_mule_centrality = np.random.beta(a=1.0, b=6.0, size=num_records)

features = [
    'amount', 'is_new_payee', 'payee_account_age_days',
    'active_phone_call', 'screen_sharing_active',
    'edge_intent_risk_score', 'graph_mule_centrality'
]

X = np.column_stack([
    amount, is_new_payee, payee_account_age_days,
    active_phone_call, screen_sharing_active,
    edge_intent_risk_score, graph_mule_centrality
])

means = X.mean(axis=0)
stds = X.std(axis=0) + 1e-7
X_norm = (X - means) / stds

true_weights = np.array([0.45, 1.2, -0.6, 1.5, 2.1, 2.8, 2.4])
bias = -3.2
logits = X_norm @ true_weights + bias
probs = 1 / (1 + np.exp(-logits))
y = (probs > 0.5).astype(int)

print(f"  [OK] Created {num_records} transaction records.")

print("\n[Step 2/3] Constructing financial transaction graph & mule cache...")
graph_cache = {
    "accumulator_hub@upi": {"mule_risk_centrality": 0.98, "in_degree": 8, "out_degree": 0},
    "power-bill@fakeaxis": {"mule_risk_centrality": 0.942, "in_degree": 12, "out_degree": 1}
}
for i in range(1, 6):
    graph_cache[f"mule_{i}@upi"] = {"mule_risk_centrality": 0.78, "in_degree": 3, "out_degree": 1}
for i in range(1, 10):
    graph_cache[f"user_{i}@upi"] = {"mule_risk_centrality": 0.05, "in_degree": 1, "out_degree": 1}

with open("graph_cache.json", "w") as f:
    json.dump(graph_cache, f, indent=2)

print("  [OK] Saved mule network risk scores to graph_cache.json.")

print("\n[Step 3/3] Training scoring weights...")
w = np.zeros(X_norm.shape[1])
b = 0.0
lr = 0.05

for epoch in range(1, 301):
    preds = 1 / (1 + np.exp(-(X_norm @ w + b)))
    grad_w = (X_norm.T @ (preds - y)) / num_records
    grad_b = np.mean(preds - y)
    w -= lr * grad_w
    b -= lr * grad_b

model_payload = {
    "features": features,
    "weights": w.tolist(),
    "bias": float(b),
    "means": means.tolist(),
    "stds": stds.tolist(),
    "model_type": "FastML_Sub20ms"
}

with open("fraud_model.json", "w") as f:
    json.dump(model_payload, f, indent=2)

with open("features.json", "w") as f:
    json.dump(features, f, indent=2)

print("\n==================================================")
print("[SUCCESS] DAY 1 ARTIFACTS GENERATED!")
print("Files created in D:\\ :")
print("  1. graph_cache.json")
print("  2. fraud_model.json")
print("  3. features.json")
print("==================================================")