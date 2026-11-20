/**
 * Kongali1720 - Tanzania Digital Sovereignty Framework
 * Production-Ready Reference Integration Gateway (Node.js / Express)
 */

"use strict";

const express = require("express");
const crypto = require("crypto");
const { parseAndValidateIso20022Xml } = require("./iso20022-validator");

const app = express();
app.disable("x-powered-by");

// Support both JSON and raw XML payloads
app.use(express.json({ limit: "1mb" }));
app.use(
  express.text({
    type: ["application/xml", "text/xml", "application/iso20022+xml"],
    limit: "1mb",
  })
);

const CONFIG = {
  port: Number(process.env.PORT || 8443),
  host: process.env.HOST || "0.0.0.0",
  serviceId: process.env.SERVICE_ID || "kongali1720-bilateral-gateway",
  jurisdiction: process.env.JURISDICTION || "TZ-SOVEREIGN-BRIDGE",
  signingKey: process.env.KONGALI1720_SIGNING_KEY || "",
  allowedApiKeys: new Set(
    (process.env.ALLOWED_API_KEYS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  ),
  maxIdempotencyEntries: Number(process.env.MAX_IDEMPOTENCY_ENTRIES || 10000),
  idempotencyStore: new Map(),
  auditLogBuffer: [],
};

if (!CONFIG.signingKey || CONFIG.signingKey.length < 16) {
  console.error(
    "FATAL: KONGALI1720_SIGNING_KEY must be set and at least 16 characters long."
  );
  process.exit(1);
}

if (CONFIG.allowedApiKeys.size === 0) {
  console.error("FATAL: ALLOWED_API_KEYS must contain at least one API key.");
  process.exit(1);
}

function nowIso() {
  return new Date().toISOString();
}

function isValidUuidV4(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function isValidReferenceId(value) {
  return typeof value === "string" && /^[A-Za-z0-9\-_]{4,35}$/.test(value);
}

function computeSha256(objOrString) {
  const raw =
    typeof objOrString === "string" ? objOrString : JSON.stringify(objOrString);
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function signEnvelope(payloadString) {
  return crypto
    .createHmac("sha256", CONFIG.signingKey)
    .update(payloadString)
    .digest("hex");
}

function saveIdempotency(key, value) {
  if (CONFIG.idempotencyStore.size >= CONFIG.maxIdempotencyEntries) {
    const oldestKey = CONFIG.idempotencyStore.keys().next().value;
    CONFIG.idempotencyStore.delete(oldestKey);
  }
  CONFIG.idempotencyStore.set(key, value);
}

function emitSocTelemetry(eventType, severity, details = {}) {
  const telemetryEvent = {
    eventId: crypto.randomUUID(),
    timestamp: nowIso(),
    source: CONFIG.serviceId,
    jurisdiction: CONFIG.jurisdiction,
    eventType,
    severity,
    details,
  };

  CONFIG.auditLogBuffer.push(telemetryEvent);
  if (CONFIG.auditLogBuffer.length > 5000) {
    CONFIG.auditLogBuffer.shift();
  }

  console.log(JSON.stringify({ soc_telemetry: telemetryEvent }));
  return telemetryEvent;
}

function authenticateClient(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token || !CONFIG.allowedApiKeys.has(token)) {
    emitSocTelemetry("AUTH_FAILED", "HIGH", {
      ip: req.ip,
      path: req.path,
      reason: "Invalid or missing bearer credential",
    });

    return res.status(401).json({
      status: "REJECTED",
      code: "ERR_UNAUTHORIZED_CLIENT",
      message: "Zero-Trust authentication failed.",
      timestamp: nowIso(),
    });
  }

  req.clientContext = {
    clientId: `client_${computeSha256(token).slice(0, 10)}`,
    authenticatedAt: nowIso(),
  };
  return next();
}

function enforceDataResidencyGuard(req, res, next) {
  const classification = String(
    req.headers["x-data-classification"] || "RESTRICTED"
  ).toUpperCase();

  if (
    classification === "SOVEREIGN_LOCAL_ONLY" ||
    classification === "RAW_PII"
  ) {
    emitSocTelemetry("DATA_RESIDENCY_BLOCKED", "HIGH", {
      clientId: req.clientContext?.clientId,
      classification,
      path: req.path,
    });

    return res.status(403).json({
      status: "REJECTED",
      code: "ERR_SOVEREIGN_RESIDENCY_VIOLATION",
      message:
        "Payloads marked SOVEREIGN_LOCAL_ONLY or RAW_PII must remain inside local sovereign storage and cannot be exported through gateway proof endpoints.",
      timestamp: nowIso(),
    });
  }

  req.dataClassification = classification;
  return next();
}

function enforceIdempotency(req, res, next) {
  const idempotencyKey = req.headers["idempotency-key"];

  if (
    !idempotencyKey ||
    typeof idempotencyKey !== "string" ||
    idempotencyKey.length < 8
  ) {
    return res.status(400).json({
      status: "REJECTED",
      code: "ERR_MISSING_IDEMPOTENCY_KEY",
      message: "Header 'Idempotency-Key' (min 8 chars) is required.",
      timestamp: nowIso(),
    });
  }

  const existing = CONFIG.idempotencyStore.get(idempotencyKey);
  if (existing) {
    emitSocTelemetry("IDEMPOTENCY_REPLAY", "INFO", {
      clientId: req.clientContext?.clientId,
      idempotencyKey,
    });

    return res.status(200).json({
      ...existing,
      idempotentReplay: true,
    });
  }

  req.idempotencyKey = idempotencyKey;
  return next();
}

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: CONFIG.serviceId,
    jurisdiction: CONFIG.jurisdiction,
    timestamp: nowIso(),
  });
});

app.post(
  "/api/v1/kongali1720/proof/anchor",
  authenticateClient,
  enforceDataResidencyGuard,
  enforceIdempotency,
  (req, res) => {
    const {
      uetr,
      referenceId,
      domain,
      originInstitution,
      targetInstitution,
      summaryMetadata,
    } = req.body || {};

    const validationErrors = [];
    if (!isValidUuidV4(uetr)) {
      validationErrors.push("Field 'uetr' must be a valid UUID v4.");
    }
    if (!isValidReferenceId(referenceId)) {
      validationErrors.push(
        "Field 'referenceId' must be 4-35 alphanumeric/hyphen/underscore characters."
      );
    }
    if (!domain || typeof domain !== "string") {
      validationErrors.push("Field 'domain' is required.");
    }
    if (!originInstitution || !targetInstitution) {
      validationErrors.push(
        "Fields 'originInstitution' and 'targetInstitution' are required."
      );
    }

    if (validationErrors.length > 0) {
      emitSocTelemetry("PAYLOAD_VALIDATION_FAILED", "MEDIUM", {
        clientId: req.clientContext.clientId,
        uetr,
        referenceId,
        validationErrors,
      });

      return res.status(422).json({
        status: "REJECTED",
        code: "ERR_INVALID_ENVELOPE",
        errors: validationErrors,
        timestamp: nowIso(),
      });
    }

    const canonicalRecord = {
      uetr: uetr.toLowerCase(),
      referenceId,
      domain: domain.toUpperCase(),
      originInstitution,
      targetInstitution,
      dataClassification: req.dataClassification,
      summaryMetadata: summaryMetadata || {},
      anchoredAt: nowIso(),
    };

    const payloadHash = computeSha256(canonicalRecord);
    const proofEnvelope = {
      proofId: `prf_${crypto.randomUUID()}`,
      gateway: CONFIG.serviceId,
      uetr: canonicalRecord.uetr,
      referenceId: canonicalRecord.referenceId,
      domain: canonicalRecord.domain,
      payloadSha256: payloadHash,
      ledgerTarget: "PERMISSIONED_BFT_VALIDATORS",
      timestamp: canonicalRecord.anchoredAt,
    };

    const signature = signEnvelope(JSON.stringify(proofEnvelope));
    const responseBody = {
      status: "ACCEPTED_FOR_ANCHOR",
      idempotentReplay: false,
      proof: proofEnvelope,
      signatureAlg: "HMAC-SHA256-HSM-READY",
      signature,
    };

    saveIdempotency(req.idempotencyKey, responseBody);

    emitSocTelemetry("PROOF_ENVELOPE_SIGNED", "INFO", {
      clientId: req.clientContext.clientId,
      proofId: proofEnvelope.proofId,
      uetr: proofEnvelope.uetr,
      referenceId: proofEnvelope.referenceId,
      domain: proofEnvelope.domain,
      payloadSha256: payloadHash,
    });

    return res.status(201).json(responseBody);
  }
);

/**
 * POST /api/v1/kongali1720/iso20022/validate-anchor
 * Accepts raw XML (Content-Type: application/xml / text/xml) or JSON { xml: "<Document>...</Document>" },
 * validates ISO 20022 fields & UETR, and generates a signed proof receipt.
 */
app.post(
  "/api/v1/kongali1720/iso20022/validate-anchor",
  authenticateClient,
  enforceDataResidencyGuard,
  enforceIdempotency,
  (req, res) => {
    const rawXml =
      typeof req.body === "string"
        ? req.body
        : req.body && typeof req.body.xml === "string"
        ? req.body.xml
        : "";

    const result = parseAndValidateIso20022Xml(rawXml);

    if (!result.valid) {
      emitSocTelemetry("ISO20022_VALIDATION_FAILED", "MEDIUM", {
        clientId: req.clientContext.clientId,
        errors: result.errors,
      });

      return res.status(422).json({
        status: "REJECTED",
        code: "ERR_INVALID_ISO20022_MESSAGE",
        errors: result.errors,
        timestamp: nowIso(),
      });
    }

    const xmlHash = computeSha256(rawXml.trim());
    const proofEnvelope = {
      proofId: `iso_${crypto.randomUUID()}`,
      gateway: CONFIG.serviceId,
      domain: "ISO20022_SETTLEMENT_AUDIT",
      messageType: result.parsed.messageType,
      uetr: result.parsed.uetr,
      messageId: result.parsed.messageId || result.parsed.businessMessageId,
      currency: result.parsed.currency,
      settlementAmount: result.parsed.settlementAmount,
      xmlSha256: xmlHash,
      ledgerTarget: "PERMISSIONED_BFT_VALIDATORS",
      timestamp: nowIso(),
    };

    const signature = signEnvelope(JSON.stringify(proofEnvelope));
    const responseBody = {
      status: "VALIDATED_AND_SIGNED",
      idempotentReplay: false,
      parsedSummary: {
        messageType: result.parsed.messageType,
        uetr: result.parsed.uetr,
        messageId: result.parsed.messageId,
        endToEndId: result.parsed.endToEndId,
        currency: result.parsed.currency,
        settlementAmount: result.parsed.settlementAmount,
        creationDateTime: result.parsed.creationDateTime,
      },
      proof: proofEnvelope,
      signatureAlg: "HMAC-SHA256-HSM-READY",
      signature,
    };

    saveIdempotency(req.idempotencyKey, responseBody);

    emitSocTelemetry("ISO20022_PROOF_SIGNED", "INFO", {
      clientId: req.clientContext.clientId,
      proofId: proofEnvelope.proofId,
      uetr: proofEnvelope.uetr,
      messageType: proofEnvelope.messageType,
      xmlSha256: xmlHash,
    });

    return res.status(201).json(responseBody);
  }
);

app.get("/api/v1/kongali1720/telemetry/recent", authenticateClient, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 25, 200);
  const events = CONFIG.auditLogBuffer.slice(-limit);
  return res.status(200).json({
    count: events.length,
    events,
  });
});

const server = app.listen(CONFIG.port, CONFIG.host, () => {
  emitSocTelemetry("GATEWAY_STARTED", "INFO", {
    host: CONFIG.host,
    port: CONFIG.port,
    serviceId: CONFIG.serviceId,
  });
  console.log(
    `[${CONFIG.serviceId}] listening on ${CONFIG.host}:${CONFIG.port} (${CONFIG.jurisdiction})`
  );
});

function shutdown(signal) {
  emitSocTelemetry("GATEWAY_SHUTDOWN", "INFO", { signal });
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
