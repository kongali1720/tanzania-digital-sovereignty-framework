# Risk Management Framework

> **Status:** Proposed Risk & Governance Framework (Draft for Institutional Review)  
> **Scope:** Technical, Cryptographic, Operational, Regulatory, and Governance Risk Management for the Tanzania Digital Sovereignty Framework.

---

## 1. Risk Assessment Methodology

To evaluate risks consistently across Digital Public Infrastructure (DPI), Zero Trust controls, permissioned ledger components, and cross-system integrations:

* **Likelihood (1–5):** `1 = Rare`, `2 = Unlikely`, `3 = Possible`, `4 = Likely`, `5 = Almost Certain`.
* **Impact (1–5):** `1 = Negligible`, `2 = Minor`, `3 = Moderate`, `4 = Major`, `5 = Severe / Sovereign-Critical`.
* **Risk Rating (`Likelihood × Impact`):**
  * `1–4` (**Low**): Routine operational monitoring and standard hygiene.
  * `5–9` (**Medium**): Scheduled controls, periodic reviews, and clear ownership.
  * `10–14` (**High**): Mandatory compensating controls, formal sign-off, and active tracking.
  * `15–25` (**Critical**): Immediate remediation/escalation required before production exposure.

---

## 2. Core Risk Categories & Controls

### A. Technical & Cryptographic Risks
* **Key & Certificate Compromise:** Exposure or misuse of signing keys, mTLS certificates, or validator keys.
  * *Mitigation:* Non-exportable HSM key storage, split-knowledge ceremonies, short-lived credentials, CRL/OCSP revocation checks, and rapid key rotation playbooks.
* **API & Boundary Bypass:** Unauthorized access via weak authentication, missing schema validation, replay attacks, or misconfigured API gateways/WAF.
  * *Mitigation:* Enforce TLS 1.3 + mTLS, OAuth 2.0/OIDC, strict JSON Schema validation, `Idempotency-Key` enforcement, timestamp replay windows, and continuous Zero Trust policy checks.
* **Ledger & Canonicalization Discrepancy:** Non-deterministic payload serialization causing hash mismatches or validator node downtime/desynchronization.
  * *Mitigation:* Standardize canonical JSON formatting prior to hashing, enforce NTP/PTP clock sync, isolate validator/RPC/admin planes, and test failover across availability zones.

### B. Operational & Data Sovereignty Risks
* **Vendor / Infrastructure Lock-In & External Dependency:** Over-reliance on proprietary third-party tooling or external cloud regions without exit portability.
  * *Mitigation:* Favor open standards/interfaces, containerized portable workloads, documented export formats, and explicit sovereign data/key residency boundaries.
* **PII Exposure & Data Leakage:** Sensitive personal or institutional records inadvertently exposed in logs, error payloads, or ledger metadata.
  * *Mitigation:* Keep sensitive PII encrypted off-chain; strip secrets/PII from logs and RFC 7807 error responses; enforce least-privilege RBAC/ABAC and data classification.
* **Incident Response & Continuity Gaps:** Delayed detection or recovery during outages, cyber incidents, or node failures.
  * *Mitigation:* Centralize SIEM/SOAR telemetry, define RTO/RPO targets per service tier, and run periodic backup restoration and incident tabletop exercises.

### C. Regulatory, Legal & Institutional Governance Risks
* **Data Protection & Jurisdictional Alignment:** Mismatches between data flows, consent records, cross-border transfers, and applicable legal/regulatory mandates.
  * *Mitigation:* Embed consent tracking and audit trails at the exchange layer; validate data residency and legal requirements with qualified legal/compliance stakeholders prior to deployment.
* **Misrepresentation of Authority or Partnerships:** Treating proposed architectures, research alignment, or bilateral technical discussions as confirmed government mandates or binding agreements.
  * *Mitigation:* Maintain strict labeling separating **verified facts**, **proposals**, **assumptions**, and **recommendations** across all documentation and public communications.

---

## 3. Summary Risk Register (Reference Baseline)

| Risk ID | Risk Domain | Key Risk Scenario | L | I | Score | Primary Mitigation |
|---|---|---|---|---|---|---|
| `RSK-01` | Cryptographic | Compromise of signing/validator keys | 2 | 5 | **10 (High)** | HSM isolation, key rotation, rapid revocation |
| `RSK-02` | Technical / API | Unauthorized API call or replay/injection | 3 | 4 | **12 (High)** | mTLS, OAuth2/OIDC, schema & idempotency checks |
| `RSK-03` | Operational / Privacy | PII leaked into logs or ledger proofs | 2 | 5 | **10 (High)** | Off-chain encrypted PII, log scrubbing, audit |
| `RSK-04` | Operational / Continuity | Validator/exchange outage or clock drift | 3 | 4 | **12 (High)** | Redundant nodes, NTP/PTP sync, DR drills |
| `RSK-05` | Governance / Legal | Unverified partnership or policy claim | 3 | 3 | **9 (Medium)** | Explicit fact/proposal labeling & source checks |

> **Governance Disclaimer:** This risk register is a proposed reference template for institutional review and tailoring. Risk scores and controls must be validated against actual system scope, threat models, and legal requirements before operational deployment.
