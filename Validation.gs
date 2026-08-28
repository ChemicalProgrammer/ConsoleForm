/**
 * Validates the payload and returns a normalized copy.
 * The case title is the only required form value.
 * @param {Object} payload
 * @return {Object}
 */
function validateAndNormalizePayload_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('No form data was received.');
  }

  return {
    caseName: normalizeCaseName_(payload.caseName),
    sectionA: validateSectionA_(payload.sectionA || {}),
    components: validateComponents_(payload.components || []),
    sectionD: validateSectionD_(payload.sectionD || {})
  };
}

function normalizeCaseName_(value) {
  var name = String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name) {
    throw new Error('The case title is required.');
  }
  if (name.length > APP_CONFIG.maxCaseNameLength) {
    throw new Error(
      'The case title cannot exceed ' + APP_CONFIG.maxCaseNameLength + ' characters.'
    );
  }
  return name;
}

function validateSectionA_(answers) {
  var normalized = {};

  FORM_SCHEMA.sectionA.fields.forEach(function(field) {
    var value = String(
      answers[field.id] == null ? '' : answers[field.id]
    ).trim();

    // Ignore an unknown select value instead of blocking case creation.
    if (
      field.type === 'select' &&
      value &&
      field.options.indexOf(value) === -1
    ) {
      value = '';
    }

    normalized[field.id] = value;
  });
  return normalized;
}

function validateComponents_(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  var database = getComponentMap_();
  var seen = {};

  return items.reduce(function(normalized, item) {
    var code = String((item && item.code) || '').trim();

    // Ignore the initial blank row, unknown codes, and duplicate rows.
    if (!code || !database[code] || seen[code]) {
      return normalized;
    }

    var component = database[code];
    seen[code] = true;
    normalized.push({
      code: component.code,
      name: component.name,
      percentage: parseOptionalNumber_(item.percentage),
      characteristics: JSON.parse(JSON.stringify(component.characteristics))
    });
    return normalized;
  }, []);
}

function validateSectionD_(answers) {
  var normalized = {};

  FORM_SCHEMA.sectionD.fields.forEach(function(field) {
    var item = answers[field.id] || {};
    normalized[field.id] = {
      min: parseOptionalNumber_(item.min),
      target: parseOptionalNumber_(item.target),
      max: parseOptionalNumber_(item.max)
    };
  });
  return normalized;
}

function parseOptionalNumber_(value) {
  if (value == null || value === '') {
    return null;
  }

  var text = String(value).trim().replace(',', '.');
  if (!text) return null;

  var parsed = Number(text);
  return isFinite(parsed) ? parsed : null;
}

function formatNumber_(value) {
  return Number(value.toFixed(4)).toString();
}
