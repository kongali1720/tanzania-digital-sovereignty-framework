# Technical Architecture Diagrams

> **Status:** Proposed Reference Architecture (Draft for Institutional Review)
> **Scope:** Digital Public Infrastructure (DPI), Permissioned Blockchain, Zero Trust Security, and System Integration for the Tanzania Digital Sovereignty Framework.

---

## 1. Digital Public Infrastructure (DPI) Layered Architecture

```mermaid
flowchart TB
    subgraph CITIZENS["Citizens, Businesses & Public Institutions"]
        U1["Web / Mobile Portals & Service Apps"]
        U2["Agency Back-Office Systems"]
    end

    subgraph ACCESS["Edge, Identity & Trust Layer"]
        IAM["Sovereign IAM & Federated Auth (OIDC / SAML / PKI)"]
        APIGW["API Gateway, Rate Limiting & WAF"]
        ZTA_PEP["Zero Trust Policy Enforcement Points (PEP)"]
    end

    subgraph DPI_CORE["Core DPI Interoperability & Data Layer"]
        XROAD["Secure Data Exchange Bus (Signed & Encrypted Messaging)"]
        REGISTRY["Core Registries (Identity, Civil, Business, Land - Domain Owned)"]
        CONSENT["Consent & Audit Logging Service"]
    end

    subgraph SOV_INFRA["Sovereign Compute, Storage & Blockchain Layer"]
        CLOUD["Sovereign Cloud / On-Premise / Hybrid Data Centers"]
        CHAIN["Permissioned Blockchain (Integrity Proofs & Cross-Agency Audit)"]
        HSM["Hardware Security Modules (HSM) & Key Management"]
    end

    U1 --> APIGW
    U2 --> ZTA_PEP
    APIGW --> IAM
    IAM --> ZTA_PEP
    ZTA_PEP --> XROAD
    XROAD <--> REGISTRY
    XROAD --> CONSENT
    REGISTRY --> CLOUD
    CONSENT --> CHAIN
    IAM <--> HSM
    CHAIN <--> HSM
```

**Key Principles:**
* **Domain Ownership:** Each core registry maintains authority over its own data; cross-system exchange happens via signed, encrypted channels.
* **Data & Key Sovereignty:** Cryptographic keys (HSM) and sensitive records remain under clear jurisdictional and operational control.

---

## 2. Permissioned Blockchain & Integrity Verification Flow

```mermaid
sequenceDiagram
    autonumber
    participant App as Agency / Public Service
    participant DB as Sovereign Off-Chain Store (Encrypted)
    participant HashSvc as Canonicalization & Hash Service
    participant Val as Consortium Validator Nodes (Ministries / Agencies)
    participant Ledger as Permissioned Blockchain Ledger

    App->>DB: Store full payload / record (access-controlled)
    App->>HashSvc: Submit record metadata + digest request
    HashSvc->>HashSvc: Compute SHA-256 digest & sign attestation
    HashSvc->>Val: Propose integrity commitment transaction
    Val->>Val: Verify validator signature, policy & consensus rules
    Val->>Ledger: Commit immutable block (hash, timestamp, actor ID)
    Ledger-->>App: Return transaction receipt / proof reference

    Note over App,Ledger: Sensitive PII remains off-chain; only cryptographic proofs & audit events are anchored.
```

**Security & Privacy Notes:**
* Sensitive personal data is not written raw onto a ledger.
* Validator nodes operate under authorized consortium governance with strict cryptographic identity and key lifecycle controls.

---

## 3. Zero Trust Architecture (ZTA) Access & Enforcement

```mermaid
flowchart LR
    subgraph SUBJECT["Subject & Device Context"]
        SUB["User / Service / Validator Node"]
        DEV["Device Posture & Telemetry"]
    end

    subgraph PEP["Policy Enforcement Point (PEP)"]
        GATE["API / Network / Service Proxy"]
    end

    subgraph POLICY_PLANE["Zero Trust Control Plane (PE & PA)"]
        PE["Policy Engine (Dynamic Risk & Identity Evaluation)"]
        PA["Policy Administrator (Session / Token / Micro-Segment Control)"]
        THREAT["Threat Intel, SIEM / SOAR & Continuous Monitoring"]
    end

    subgraph PROTECTED["Protected Sovereign Resources"]
        RES1["Core APIs & Registries"]
        RES2["Blockchain Validator & RPC Nodes"]
        RES3["Admin & Key Management Planes"]
    end

    SUB --> GATE
    DEV --> GATE
    GATE <-->|"AuthN / AuthZ / Posture Query"| PE
    THREAT --> PE
    PE --> PA
    PA -->|"Short-Lived Credentials / Route Rules"| GATE
    GATE -->|"Authorized, Encrypted, Micro-Segmented Traffic"| RES1
    GATE -->|"Authorized, Encrypted, Micro-Segmented Traffic"| RES2
    GATE -->|"Authorized, Encrypted, Micro-Segmented Traffic"| RES3
```

**Core Controls:**
* No implicit trust based solely on network location (including internal networks or VPNs).
* Short-lived tokens/certificates, continuous device posture checks, and least-privilege isolation for admin and validator planes.

---

## 4. Cross-System Integration & Reference Exchange Model

```mermaid
flowchart TB
    subgraph EXT["External / Partner / Reference Systems"]
        REF["Standards, Research & Bilateral Technical Exchange<br/>(e.g., Indonesia–Tanzania Knowledge & Standards Sharing)"]
        PARTNER["Authorized External / Ecosystem Services"]
    end

    subgraph BOUNDARY["Sovereign Boundary & Interoperability Gateway"]
        SCHEMA["Schema Validation, Versioning & Policy Guard"]
        AUDIT["Immutable Audit & Non-Repudiation Log"]
    end

    subgraph INT["Internal Sovereign Services"]
        SVC["DPI Services, Registries & Monitoring"]
    end

    PARTNER -->|"TLS 1.3 + mTLS + Signed Requests"| SCHEMA
    REF -.->|"Policy & Technical Reference Alignment (Non-Binding)"-> SCHEMA
    SCHEMA -->|"Validated & Authorized Calls"| SVC
    SCHEMA --> AUDIT
    SVC --> AUDIT
```

> **Governance Disclaimer:** This diagram represents a proposed reference architecture. Bilateral partnerships, cross-border integrations, or institutional endorsements are only reflected as active when supported by verified evidence and formal agreements.
