# Detailed Technical Specifications

> **Status:** Proposed Technical Specification (Draft for Institutional Review)  
> **Scope:** API Standards, Public Key Infrastructure (PKI), Permissioned Validator Nodes, and Cross-System Interoperability for the Tanzania Digital Sovereignty Framework.

---

## 1. API & Data Exchange Specification

All cross-agency and ecosystem APIs operating over the Sovereign Interoperability Layer should follow consistent contract, security, and observability rules:

* **Transport & Authentication:** Enforce **TLS 1.3** with Mutual TLS (**mTLS**) for service-to-service traffic and **OAuth 2.0 / OIDC** (short-lived JWT access tokens) for delegated or user-facing requests.
* **Protocol & Payload Format:** Use HTTPS JSON/REST APIs with UTF-8 encoding, explicit semantic versioning in the path or headers (e.g., `/v1/...`), and strict JSON Schema validation at the gateway boundary.
* **Idempotency & Reliability:** State-mutating endpoints (`POST`, `PUT`, `PATCH`) must support an `Idempotency-Key` header (UUIDv4) with deterministic replay handling and bounded retry backoff.
* **Standard Request & Correlation Headers:**
  * `X-Correlation-ID`: End-to-end trace identifier across gateways, registries, and audit logs.
  * `X-Source-System`: Authenticated identifier of the calling institution or service.
  * `X-Timestamp`: ISO-8601 UTC timestamp for replay-window enforcement.
* **Error & Rate-Limit Contract:** Return structured RFC 7807 (`application/problem+json`) error responses and explicit rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`) enforced at the API Gateway / WAF.

---

## 2. Public Key Infrastructure (PKI) & Key Management Specification

Cryptographic trust across identity, API signing, ledger attestation, and audit records depends on strict key lifecycle governance:

* **Certificate Hierarchy:**
  * **Offline Root CA:** Air-gapped, stored in high-assurance Hardware Security Modules (**HSM**), with long validity and multi-party ceremony controls.
  * **Issuing / Operational CAs:** Dedicated intermediate CAs separated by domain (e.g., TLS/mTLS service certificates, document/payload signing, and validator node identities).
* **Algorithms & Key Lengths:** Prefer modern, widely supported asymmetric algorithms (e.g., **ECDSA P-256 / P-384** or **RSA-3072/4096** per interoperability profile) and **SHA-256 / SHA-384** for digests; prohibit deprecated primitives (`MD5`, `SHA-1`, `RC4`, `TLS < 1.2`).
* **HSM & Key Lifecycle Controls:**
  * Private keys for CAs, signers, and critical infrastructure should be generated non-exportably inside FIPS 140-3 Level 3 (or equivalent sovereign-approved) HSMs.
  * Define clear key rotation intervals, emergency revocation playbooks, dual-control/split-knowledge key ceremonies, and tamper-evident audit trails.
* **Revocation & Trust Verification:** Publish signed Certificate Revocation Lists (**CRL**) and operate **OCSP** responders with caching and fail-closed verification policies on sensitive trust boundaries.

---

## 3. Permissioned Validator Node Specification

Where a permissioned blockchain is used for cross-agency integrity proofs and non-repudiable audit anchoring, validator nodes must meet strict operational and privacy boundaries:

* **Permissioned Membership & Node Identity:** Only vet-approved institutional nodes (e.g., designated ministries, agencies, or consortium members) may participate in block production/validation, bound to PKI/mTLS node identities.
* **Off-Chain vs. On-Chain Data Boundary:**
  * **Off-Chain (Encrypted Sovereign Storage):** Personal Identifiable Information (PII), raw citizen/business records, and confidential payloads remain in access-controlled sovereign databases.
  * **On-Chain (Ledger):** Store only canonicalized cryptographic hashes/digests, timestamps, actor/service identifiers, and proof metadata—never raw sensitive PII.
* **Network & Runtime Isolation:**
  * Separate **Validator/Consensus Plane**, **RPC/Query Plane**, and **Management/SSH Plane** into distinct network segments with Zero Trust policy enforcement.
  * Restrict RPC/admin endpoints from public internet exposure; enforce strict firewall allowlists and host hardening.
* **Availability, State & Monitoring:**
  * Deploy redundant nodes across sovereign availability zones/data centers with automated snapshot backup and recovery testing.
  * Monitor block finality latency, peer connectivity, clock synchronization (**NTP/PTP**), disk/ledger growth, and anomalous signing attempts via SIEM/SOAR.

---

## 4. Interoperability & Reference Alignment Specification

* **Canonicalization & Schema Versioning:** Canonicalize JSON/payload structures prior to hashing so integrity proofs are deterministic across services and upgrades; deprecate schemas with documented notice periods.
* **Policy & Standards Alignment:** Technical alignment with international standards (such as NIST, ISO/IEC, and open DPI exchange patterns) and bilateral technical exchanges (such as Indonesia–Tanzania knowledge sharing) serves as **non-binding technical reference** unless formalized through verified institutional agreements.

> **Governance Disclaimer:** This specification defines a proposed reference baseline for architectural and institutional review. It does not assert active government deployment, statutory authority, or confirmed bilateral commitments without verified evidence.
