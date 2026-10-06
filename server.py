import time
import json
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize App
app = FastAPI(
    title="Dual-Plane AI Scam Prevention Gateway",
    description="Sub-30ms Deterministic Transaction Risk Engine with Cognitive Friction Tiers",
    version="2.0.0"
)

# Enable CORS for local web/mobile demo connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory state
MODEL = None
GRAPH_CACHE = {}

@app.on_event("startup")
def load_artifacts():
    global MODEL, GRAPH_CACHE
    print("\n[GATEWAY STARTUP] Hydrating ML weights and Graph cache into RAM...")
    
    with open("fraud_model.json", "r") as f:
        MODEL = json.load(f)
        
    with open("graph_cache.json", "r") as f:
        GRAPH_CACHE = json.load(f)
        
    print(f"  -> Model Type: {MODEL.get('model_type')}")
    print(f"  -> Loaded Graph Nodes: {len(GRAPH_CACHE)} cached VPAs")
    print("  -> Status: In-Memory Gateway Ready (Target SLA < 30ms)\n")

# Request Schema
class TransactionRequest(BaseModel):
    transaction_id: str = "TXN_982341"
    sender_id: str = "user_8910"
    recipient_vpa: str = "power-bill@fakeaxis"
    amount: float = 25000.0
    is_new_payee: bool = True
    payee_account_age_days: float = 0.5
    active_phone_call: bool = True
    screen_sharing_active: bool = False
    edge_intent_token: str = "UTILITY_DISCONNECT_SCAM" 
    # Options: "SAFE", "URGENT_KYC_THREAT", "UTILITY_DISCONNECT_SCAM", "LOTTERY_CLAIM"

# Severity weights for On-Device Edge Tokens (Zero raw text transmitted)
TOKEN_SEVERITY_MAP = {
    "SAFE": 0.05,
    "LOTTERY_CLAIM": 0.65,
    "URGENT_KYC_THREAT": 0.88,
    "UTILITY_DISCONNECT_SCAM": 0.94
}

@app.post("/api/v1/evaluate-transaction")
def evaluate_transaction(req: TransactionRequest):
    t_start = time.perf_counter()
    
    # 1. Edge Token Severity mapping (< 0.1ms)
    edge_intent_score = TOKEN_SEVERITY_MAP.get(req.edge_intent_token, 0.50)
    
    # 2. Redis/Graph O(1) in-memory cache lookup (< 0.2ms)
    graph_entry = GRAPH_CACHE.get(req.recipient_vpa, {
        "mule_risk_centrality": 0.10,
        "in_degree": 1,
        "out_degree": 1
    })
    mule_centrality = graph_entry["mule_risk_centrality"]
    
    # 3. Assemble feature vector
    raw_vector = np.array([
        req.amount,
        1.0 if req.is_new_payee else 0.0,
        req.payee_account_age_days,
        1.0 if req.active_phone_call else 0.0,
        1.0 if req.screen_sharing_active else 0.0,
        edge_intent_score,
        mule_centrality
    ])
    
    # Normalize with saved distribution parameters
    means = np.array(MODEL["means"])
    stds = np.array(MODEL["stds"])
    x_norm = (raw_vector - means) / stds
    
    # 4. Ultra-Fast Linear/Sigmoid Scoring (< 1ms)
    weights = np.array(MODEL["weights"])
    bias = MODEL["bias"]
    logit = float(np.dot(x_norm, weights) + bias)
    fraud_probability = 1.0 / (1.0 + np.exp(-logit))
    
    risk_score = round(fraud_probability * 100, 1)
    
    # 5. Measure Deterministic Latency
    latency_ms = round((time.perf_counter() - t_start) * 1000, 2)
    
    # 6. Feature Contribution & SHAP-style Reason Explainer
    contributions = x_norm * weights
    reasons = []
    
    if req.active_phone_call and req.is_new_payee:
        reasons.append("Active voice call detected during transfer to an unlinked recipient")
    if edge_intent_score > 0.70:
        reasons.append(f"On-device scanner identified high-risk cue: '{req.edge_intent_token}'")
    if mule_centrality > 0.70:
        reasons.append("Recipient VPA matches known mule network community cluster")
    if req.amount > 10000 and req.payee_account_age_days < 2.0:
        reasons.append("High-value outflow to newly generated payment address")
        
    if not reasons:
        reasons.append("Normal transaction velocity and payee behavior")

    # 7. Dynamic Friction & Intervention Tiers
    if risk_score < 40.0:
        decision = "ALLOW"
        intervention = {
            "action": "PROCEED",
            "message": "Payment verified safe. Proceed to UPI PIN."
        }
    elif 40.0 <= risk_score <= 75.0:
        decision = "CONTEXTUAL_WARNING"
        intervention = {
            "action": "WARN_AND_CONFIRM",
            "warning_banner": f"Caution: Recipient account was registered only {req.payee_account_age_days:.1f} days ago.",
            "requires_acknowledgment": True
        }
    else:
        decision = "COGNITIVE_CIRCUIT_BREAKER"
        intervention = {
            "action": "ENFORCE_COOLING_HOLD",
            "hold_duration_seconds": 300,
            "anti_coercion_quiz": {
                "question": "Are you sending money because someone on the phone warned of a service cutoff?",
                "options": [
                    {"text": "Yes, someone on call told me to pay immediately", "is_scam_confession": True},
                    {"text": "No, this is a trusted personal transfer", "is_scam_confession": False}
                ]
            }
        }
        
    return {
        "status": "success",
        "transaction_id": req.transaction_id,
        "risk_score": risk_score,
        "decision": decision,
        "latency_ms": latency_ms,
        "reason_codes": reasons,
        "payee_graph_telemetry": graph_entry,
        "intervention": intervention
    }

@app.get("/health")
def health():
    return {"status": "online", "engine": "Dual-Plane Fraud Guard v2"}