import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ScrollView, SafeAreaView, ActivityIndicator, Alert, Modal 
} from 'react-native';

// REPLACE THIS with your localtunnel HTTPS URL from Step 1
const BACKEND_URL = " https://proud-things-push.loca.lt";

export default function App() {
  // Mobile Telemetry State
  const [activeCall, setActiveCall] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [vpa, setVpa] = useState("power-bill@fakeaxis");
  const [amount, setAmount] = useState("25000");
  const [edgeToken, setEdgeToken] = useState("UTILITY_DISCONNECT_SCAM");

  // Flow State
  const [evaluating, setEvaluating] = useState(false);
  const [mlResult, setMlResult] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Post-Fraud LLM Agent State
  const [freezeActive, setFreezeActive] = useState(false);
  const [llmDocket, setLlmDocket] = useState(null);
  const [victimStatement, setVictimStatement] = useState(
    "A caller claiming to be from the electricity board said my connection would be terminated at 10 PM if I did not clear this bill immediately."
  );

  // 1. IN-LINE TRANSACTION EVALUATION (ML Engine)
  const handleInitiatePayment = async () => {
    setEvaluating(true);
    setMlResult(null);
    setLlmDocket(null);

    const payload = {
      transaction_id: "TXN_" + Math.floor(Math.random() * 899999 + 100000),
      sender_id: "usr_mobile_device",
      recipient_vpa: vpa,
      amount: parseFloat(amount) || 0,
      is_new_payee: true,
      payee_account_age_days: 0.5,
      active_phone_call: activeCall,
      screen_sharing_active: screenSharing,
      edge_intent_token: edgeToken
    };

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/evaluate-transaction`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true" 
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      setMlResult(data);
      
      if (data.decision === "COGNITIVE_CIRCUIT_BREAKER") {
        setCooldownSeconds(300);
      }
    } catch (e) {
      Alert.alert("Network Error", "Unable to contact risk gateway: " + e.message);
    } finally {
      setEvaluating(false);
    }
  };

  // 2. POST-PAYMENT AUTONOMOUS LLM AGENT (Lien Hold & Bank Recall)
  const handleTriggerLlmFreeze = async () => {
    setFreezeActive(true);
    
    const payload = {
      transaction_id: mlResult ? mlResult.transaction_id : "TXN_991823",
      amount: parseFloat(amount) || 0,
      recipient_vpa: vpa,
      victim_statement: victimStatement,
      call_active_during_txn: activeCall
    };

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/agent/emergency-freeze`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true"
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      setLlmDocket(data.docket);
    } catch (e) {
      Alert.alert("Agent Error", "Failed to contact autonomous agent: " + e.message);
    } finally {
      setFreezeActive(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Mobile Header Bar */}
        <View style={styles.header}>
          <Text style={styles.title}>🛡️ FinShield UPI</Text>
          <Text style={styles.subtitle}>Dual-Plane AI Autonomous Fraud Interceptor</Text>
        </View>

        {/* Device Environment Mock (Real-world signals) */}
        <View style={styles.telemetryCard}>
          <Text style={styles.sectionHeader}>LIVE SENSOR TELEMETRY</Text>
          
          <View style={styles.toggleRow}>
            <Text style={styles.telemetryLabel}>📞 Active Voice Call Detected</Text>
            <TouchableOpacity 
              style={[styles.chip, activeCall ? styles.chipRed : styles.chipGreen]} 
              onPress={() => setActiveCall(!activeCall)}
            >
              <Text style={styles.chipText}>{activeCall ? "CALL ENGAGED" : "NO CALL"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.telemetryLabel}>💬 On-Device Token (Privacy Preserved)</Text>
            <TouchableOpacity 
              style={styles.chip}
              onPress={() => setEdgeToken(edgeToken === "UTILITY_DISCONNECT_SCAM" ? "SAFE" : "UTILITY_DISCONNECT_SCAM")}
            >
              <Text style={styles.chipText}>{edgeToken}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* UPI Payment Input Card */}
        <View style={styles.paymentCard}>
          <Text style={styles.sectionHeader}>INITIATE TRANSFER</Text>
          
          <Text style={styles.inputLabel}>Beneficiary UPI ID / VPA</Text>
          <TextInput 
            style={styles.input} 
            value={vpa} 
            onChangeText={setVpa} 
          />

          <Text style={styles.inputLabel}>Transfer Amount (INR ₹)</Text>
          <TextInput 
            style={styles.input} 
            value={amount} 
            keyboardType="numeric" 
            onChangeText={setAmount} 
          />

          <TouchableOpacity 
            style={styles.btnPay} 
            onPress={handleInitiatePayment}
            disabled={evaluating}
          >
            {evaluating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPayText}>Pay ₹{amount}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* PLANE 1: FAST ML IN-LINE SCORING RESULT */}
        {mlResult && (
          <View style={styles.resultBox}>
            <View style={styles.slaBadge}>
              <Text style={styles.slaText}>In-Line Engine Latency: {mlResult.latency_ms} ms</Text>
            </View>

            {mlResult.decision === "COGNITIVE_CIRCUIT_BREAKER" ? (
              <View style={styles.breakerCard}>
                <Text style={styles.breakerHeading}>🛑 CIRCUIT BREAKER TRIGGERED</Text>
                <Text style={styles.scoreText}>Risk Anomaly: {mlResult.risk_score} / 100</Text>
                <Text style={styles.breakerDesc}>
                  UPI PIN entry disabled. Social engineering urgency pattern detected with active call coaching.
                </Text>

                <View style={styles.timerBadge}>
                  <Text style={styles.timerText}>⏳ Mandatory Cooling Hold: 05:00</Text>
                </View>

                {/* Post-Fraud LLM Agent Trigger */}
                <TouchableOpacity 
                  style={styles.btnFreeze} 
                  onPress={handleTriggerLlmFreeze}
                  disabled={freezeActive}
                >
                  {freezeActive ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnFreezeText}>🚨 Coerced Anyway? Trigger LLM Autonomous Recall</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.safeCard}>
                <Text style={styles.safeHeading}>✅ TRANSACTION CLEARED</Text>
                <Text style={styles.safeDesc}>Risk Score: {mlResult.risk_score}/100. Dispatched to UPI PIN screen.</Text>
              </View>
            )}
          </View>
        )}

        {/* PLANE 2: AUTONOMOUS POST-FRAUD LLM AGENT OUTPUT */}
        {llmDocket && (
          <View style={styles.agentCard}>
            <Text style={styles.agentHeading}>🤖 AUTONOMOUS AGENT INCIDENT DOCKET</Text>
            <Text style={styles.agentSub}>Standard: ISO 20022 Camt.056 Inter-bank Administrative Lien</Text>

            <View style={styles.docketRow}>
              <Text style={styles.docketKey}>Case Reference:</Text>
              <Text style={styles.docketVal}>{llmDocket.incident_docket_id}</Text>
            </View>

            <View style={styles.docketRow}>
              <Text style={styles.docketKey}>Target Bank Switch:</Text>
              <Text style={styles.docketVal}>{llmDocket.iso20022_camt056_recall.target_switch}</Text>
            </View>

            <View style={styles.docketRow}>
              <Text style={styles.docketKey}>Intervention Type:</Text>
              <Text style={styles.docketVal}>{llmDocket.iso20022_camt056_recall.lien_request_type}</Text>
            </View>

            <Text style={styles.logHeader}>Autonomous Action Trail:</Text>
            {llmDocket.action_timeline.map((act, i) => (
              <Text key={i} style={styles.logText}>• {act}</Text>
            ))}

            <View style={styles.guidanceBox}>
              <Text style={styles.guidanceHeader}>Victim Protection Directives:</Text>
              {llmDocket.victim_safeguard_instructions.map((inst, j) => (
                <Text key={j} style={styles.guidanceText}>{j + 1}. {inst}</Text>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  scroll: { padding: 16 },
  header: { alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', color: '#f8fafc' },
  subtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  telemetryCard: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#1f2937' },
  sectionHeader: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 1, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  telemetryLabel: { color: '#cbd5e1', fontSize: 12 },
  chip: { backgroundColor: '#1e293b', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  chipRed: { backgroundColor: '#7f1d1d' },
  chipGreen: { backgroundColor: '#064e3b' },
  chipText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  paymentCard: { backgroundColor: '#111827', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1f2937', marginBottom: 14 },
  inputLabel: { color: '#94a3b8', fontSize: 11, marginBottom: 4 },
  input: { backgroundColor: '#1e293b', color: '#fff', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 13 },
  btnPay: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  btnPayText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  resultBox: { marginBottom: 14 },
  slaBadge: { alignSelf: 'flex-end', marginBottom: 4 },
  slaText: { color: '#10b981', fontSize: 11, fontWeight: '700' },
  breakerCard: { backgroundColor: '#3b0d0c', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ef4444' },
  breakerHeading: { color: '#fca5a5', fontWeight: '900', fontSize: 15, textAlign: 'center' },
  scoreText: { color: '#ffffff', textAlign: 'center', fontWeight: '700', marginVertical: 3, fontSize: 12 },
  breakerDesc: { color: '#fecaca', fontSize: 11, textAlign: 'center', marginVertical: 6 },
  timerBadge: { backgroundColor: '#7f1d1d', padding: 6, borderRadius: 6, alignItems: 'center', marginVertical: 6 },
  timerText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  btnFreeze: { backgroundColor: '#dc2626', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  btnFreezeText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  safeCard: { backgroundColor: '#064e3b', padding: 14, borderRadius: 12, alignItems: 'center' },
  safeHeading: { color: '#6ee7b7', fontWeight: '800', fontSize: 14 },
  safeDesc: { color: '#d1fae5', fontSize: 11, marginTop: 2 },
  agentCard: { backgroundColor: '#172554', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20 },
  agentHeading: { color: '#bfdbfe', fontWeight: '900', fontSize: 13, marginBottom: 2 },
  agentSub: { color: '#93c5fd', fontSize: 10, marginBottom: 10 },
  docketRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  docketKey: { color: '#93c5fd', fontSize: 11, fontWeight: '700' },
  docketVal: { color: '#ffffff', fontSize: 11 },
  logHeader: { color: '#bfdbfe', fontWeight: '700', fontSize: 11, marginTop: 8, marginBottom: 4 },
  logText: { color: '#dbeafe', fontSize: 10, marginVertical: 1 },
  guidanceBox: { marginTop: 10, backgroundColor: '#0b132b', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#38bdf8' },
  guidanceHeader: { color: '#38bdf8', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  guidanceText: { color: '#f1f5f9', fontSize: 10, marginVertical: 1 }
});