/**
 * Kongali1720 ISO 20022 XML Parser & Validator
 * Supports Business Application Header (head.001) & pacs.008 payment messages.
 */

"use strict";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractTag(xml, tagName) {
  if (typeof xml !== "string" || !xml.trim()) return null;
  // Match optional namespace prefix like <ns2:UETR> or <UETR>
  const regex = new RegExp(
    `<(?:[A-Za-z0-9_-]+:)?${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[A-Za-z0-9_-]+:)?${tagName}>`,
    "i"
  );
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractAttribute(xml, tagName, attrName) {
  if (typeof xml !== "string" || !xml.trim()) return null;
  const tagRegex = new RegExp(
    `<(?:[A-Za-z0-9_-]+:)?${tagName}([^>]*)>`,
    "i"
  );
  const tagMatch = xml.match(tagRegex);
  if (!tagMatch) return null;

  const attrRegex = new RegExp(`${attrName}\\s*=\\s*["']([^"']+)["']`, "i");
  const attrMatch = tagMatch[1].match(attrRegex);
  return attrMatch ? attrMatch[1].trim() : null;
}

function parseAndValidateIso20022Xml(xmlString) {
  const errors = [];

  if (typeof xmlString !== "string" || xmlString.trim().length < 20) {
    return {
      valid: false,
      errors: ["XML payload is empty or malformed."],
      parsed: null,
    };
  }

  // Basic XXE / external entity guard on raw XML string
  if (/<!DOCTYPE\s+[^>]*\[/i.test(xmlString) || /<!ENTITY/i.test(xmlString)) {
    return {
      valid: false,
      errors: ["DOCTYPE with internal subset or ENTITY declaration is forbidden."],
      parsed: null,
    };
  }

  const msgDefIdr =
    extractTag(xmlString, "MsgDefIdr") ||
    (xmlString.includes("FIToFICstmrCdtTrf") ? "pacs.008.001.08" : null);

  const bizMsgIdr = extractTag(xmlString, "BizMsgIdr");
  const msgId = extractTag(xmlString, "MsgId");
  const creDtTm = extractTag(xmlString, "CreDtTm");
  const uetr = extractTag(xmlString, "UETR");
  const endToEndId = extractTag(xmlString, "EndToEndId");
  const amountRaw = extractTag(xmlString, "IntrBkSttlmAmt");
  const currency =
    extractAttribute(xmlString, "IntrBkSttlmAmt", "Ccy") ||
    extractTag(xmlString, "Ccy");

  const debtorName =
    extractTag(xmlString, "Dbtr") && extractTag(extractTag(xmlString, "Dbtr"), "Nm");
  const creditorName =
    extractTag(xmlString, "Cdtr") && extractTag(extractTag(xmlString, "Cdtr"), "Nm");

  if (!msgId && !bizMsgIdr) {
    errors.push("Missing message identifier (<MsgId> or <BizMsgIdr>).");
  }

  if (!uetr || !UUID_V4_REGEX.test(uetr)) {
    errors.push("Missing or invalid <UETR>; must conform to UUID v4.");
  }

  if (!creDtTm || Number.isNaN(Date.parse(creDtTm))) {
    errors.push("Missing or invalid <CreDtTm> ISO-8601 timestamp.");
  }

  const numericAmount = amountRaw !== null ? Number(amountRaw) : NaN;
  if (amountRaw === null || Number.isNaN(numericAmount) || numericAmount <= 0) {
    errors.push("Missing or invalid <IntrBkSttlmAmt>; must be a positive number.");
  }

  if (!currency || !/^[A-Z]{3}$/.test(currency)) {
    errors.push("Missing or invalid ISO 4217 3-letter currency code (Ccy).");
  }

  const parsed = {
    messageType: msgDefIdr || "UNSPECIFIED_ISO20022",
    businessMessageId: bizMsgIdr || null,
    messageId: msgId || null,
    creationDateTime: creDtTm || null,
    uetr: uetr ? uetr.toLowerCase() : null,
    endToEndId: endToEndId || null,
    settlementAmount: Number.isNaN(numericAmount) ? null : numericAmount,
    currency: currency || null,
    debtorName: debtorName || null,
    creditorName: creditorName || null,
  };

  return {
    valid: errors.length === 0,
    errors,
    parsed,
  };
}

module.exports = {
  parseAndValidateIso20022Xml,
};
