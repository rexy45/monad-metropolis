import numpy as np
import json
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score

print("[1/4] Generating legitimate financial transaction distribution (10,000 samples)...")
np.random.seed(42)
N = 10000

# Feature 0: Amount (Normal log-normal spending vs High fraud spike)
amt_clean = np.random.exponential(scale=1500, size=int(N*0.92))
amt_fraud = np.random.exponential(scale=22000, size=int(N*0.08)) + 5000
amount = np.concatenate([amt_clean, amt_fraud])

# Feature 1: is_new_payee (0 or 1)
new_clean = np.random.binomial(1, 0.25, size=int(N*0.92))
new_fraud = np.random.binomial(1, 0.88, size=int(N*0.08))
is_new = np.concatenate([new_clean, new_fraud])

# Feature 2: payee_account_age_days
age_clean = np.random.exponential(scale=180, size=int(N*0.92)) + 5
age_fraud = np.random.exponential(scale=3, size=int(N*0.08)) + 0.1
age = np.concatenate([age_clean, age_fraud])

# Feature 3: active_phone_call (0 or 1)
call_clean = np.random.binomial(1, 0.08, size=int(N*0.92))
call_fraud = np.random.binomial(1, 0.85, size=int(N*0.08))
call = np.concatenate([call_clean, call_fraud])

# Feature 4: screen_sharing_active (0 or 1)
screen_clean = np.random.binomial(1, 0.01, size=int(N*0.92))
screen_fraud = np.random.binomial(1, 0.40, size=int(N*0.08))
screen = np.concatenate([screen_clean, screen_fraud])

# Feature 5: edge_intent_score (0.0 to 1.0)
token_clean = np.random.beta(a=1, b=8, size=int(N*0.92))
token_fraud = np.random.beta(a=8, b=2, size=int(N*0.08))
token_score = np.concatenate([token_clean, token_fraud])

# Feature 6: mule_risk_centrality (0.0 to 1.0)
mule_clean = np.random.beta(a=1, b=5, size=int(N*0.92))
mule_fraud = np.random.beta(a=7, b=2, size=int(N*0.08))
mule = np.concatenate([mule_clean, mule_fraud])

X = np.column_stack([amount, is_new, age, call, screen, token_score, mule])
y = np.concatenate([np.zeros(int(N*0.92)), np.ones(int(N*0.08))])

# Split & Train
print("[2/4] Splitting train/test & fitting Logistic Regression...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Feature normalization
means = X_train.mean(axis=0)
stds = X_train.std(axis=0)
stds[stds == 0] = 1.0

X_train_norm = (X_train - means) / stds
X_test_norm = (X_test - means) / stds

clf = LogisticRegression(class_weight='balanced', max_iter=1000)
clf.fit(X_train_norm, y_train)

# Evaluate
y_pred = clf.predict(X_test_norm)
y_prob = clf.predict_proba(X_test_norm)[:, 1]
auc = roc_auc_score(y_test, y_prob)

print("\n" + "="*50)
print(f"MODEL PERFORMANCE EVALUATION (ROC-AUC: {auc:.4f})")
print("="*50)
print(classification_report(y_test, y_pred, target_names=["Normal Transaction", "Scam Coercion"]))

print("[3/4] Exporting model weights to fraud_model.json...")
model_artifact = {
    "model_type": "Trained_LogisticRegression_Sub20ms",
    "weights": clf.coef_[0].tolist(),
    "bias": float(clf.intercept_[0]),
    "means": means.tolist(),
    "stds": stds.tolist(),
    "features": [
        "amount", "is_new_payee", "payee_account_age_days",
        "active_phone_call", "screen_sharing_active", 
        "edge_intent_score", "mule_risk_centrality"
    ],
    "roc_auc": float(auc)
}

with open("fraud_model.json", "w") as f:
    json.dump(model_artifact, f, indent=2)

print("SUCCESS: fraud_model.json updated with mathematically trained weights!")