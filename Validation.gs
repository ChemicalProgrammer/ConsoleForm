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
  var otherIndex = 0;

  return items.reduce(function(normalized, item) {
    item = item || {};
    var requestedCode = String(item.code || '').trim();
    var databaseComponent = database[requestedCode];
    var isCustom = Boolean(item.isCustom) || !databaseComponent;

    if (!isCustom && databaseComponent) {
      normalized.push({
        code: databaseComponent.code,
        name: databaseComponent.name,
        percentage: parseOptionalNumber_(item.percentage),
        characteristics: JSON.parse(JSON.stringify(databaseComponent.characteristics)),
        isCustom: false
      });
      return normalized;
    }

    var name = String(item.name || '').trim();
    var characteristics = normalizeCustomCharacteristics_(item.characteristics || {});
    var hasCharacteristic = Object.keys(characteristics).some(function(key) {
      return characteristics[key] !== '';
    });
    var hasPercentage = parseOptionalNumber_(item.percentage) != null;

    // A completely untouched optional row is ignored.
    if (!requestedCode && !name && !hasCharacteristic && !hasPercentage) {
      return normalized;
    }

    otherIndex += 1;
    normalized.push({
      code: requestedCode || ('OTHER-' + padNumber_(otherIndex, 3)),
      name: name || 'Other component',
      percentage: parseOptionalNumber_(item.percentage),
      characteristics: characteristics,
      isCustom: true
    });
    return normalized;
  }, []);
}

function normalizeCustomCharacteristics_(values) {
  var normalized = {};
  FORM_SCHEMA.sectionC.characteristics.forEach(function(characteristic) {
    var value = values[characteristic.id];
    normalized[characteristic.id] = value == null ? '' : String(value).trim();
  });
  return normalized;
}

function padNumber_(value, length) {
  var text = String(value);
  while (text.length < length) text = '0' + text;
  return text;
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
