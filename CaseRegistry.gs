/**
 * Case Registry stored in Script Properties.
 *
 * Each case is stored as an independent JSON value. This avoids rewriting one
 * large JSON document and keeps concurrent writes safe when the public service
 * methods use ScriptLock. Form answers remain in each case spreadsheet.
 */
var CASE_REGISTRY_COLUMNS = Object.freeze([
  { key: 'caseId', header: 'CASE_ID' },
  { key: 'caseName', header: 'CASE_NAME' },
  { key: 'folderId', header: 'FOLDER_ID' },
  { key: 'spreadsheetId', header: 'SPREADSHEET_ID' },
  { key: 'status', header: 'STATUS' },
  { key: 'createdAt', header: 'CREATED_AT' },
  { key: 'updatedAt', header: 'UPDATED_AT' },
  { key: 'createdBy', header: 'CREATED_BY' },
  { key: 'updatedBy', header: 'UPDATED_BY' },
  { key: 'schemaVersion', header: 'SCHEMA_VERSION' },
  { key: 'trashedAt', header: 'TRASHED_AT' },
  { key: 'trashedBy', header: 'TRASHED_BY' }
]);

function getAllCaseRecords_() {
  migrateLegacySheetRegistryIfNeeded_();
  var properties = PropertiesService.getScriptProperties().getProperties();
  var prefix = APP_CONFIG.registryRecordPrefix;

  return Object.keys(properties).reduce(function(records, key) {
    if (key.indexOf(prefix) !== 0) return records;
    try {
      var record = JSON.parse(properties[key]);
      if (record && String(record.caseId || '').trim()) records.push(record);
    } catch (error) {
      console.error('Invalid Case Registry property “' + key + '”: ' + error.message);
    }
    return records;
  }, []);
}

function findCaseRecordById_(caseId) {
  var normalizedId = String(caseId || '').trim();
  if (!normalizedId) throw new Error('A valid case ID is required.');

  migrateLegacySheetRegistryIfNeeded_();
  var json = PropertiesService.getScriptProperties().getProperty(
    caseRecordPropertyKey_(normalizedId)
  );
  if (!json) throw new Error('The requested case was not found in the registry.');

  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error('The requested case contains invalid registry metadata.');
  }
}

function findCaseRecordByFolderId_(folderId) {
  return getAllCaseRecords_().find(function(item) {
    return String(item.folderId) === String(folderId || '');
  }) || null;
}

function listCaseRecords_(includeTrashed) {
  return getAllCaseRecords_()
    .filter(function(record) {
      return includeTrashed || String(record.status) !== 'TRASHED';
    })
    .sort(function(left, right) {
      return dateToMillis_(right.updatedAt) - dateToMillis_(left.updatedAt);
    });
}

function appendCaseRecord_(record) {
  var caseId = String((record && record.caseId) || '').trim();
  if (!caseId) throw new Error('A Case Registry record requires a case ID.');

  var properties = PropertiesService.getScriptProperties();
  var key = caseRecordPropertyKey_(caseId);
  if (properties.getProperty(key)) {
    throw new Error('A Case Registry record already exists for this case ID.');
  }
  properties.setProperty(key, JSON.stringify(normalizeCaseRecordForStorage_(record)));
  return findCaseRecordById_(caseId);
}

function updateCaseRecord_(caseId, updates) {
  var record = findCaseRecordById_(caseId);
  updates = updates || {};
  CASE_REGISTRY_COLUMNS.forEach(function(column) {
    if (Object.prototype.hasOwnProperty.call(updates, column.key)) {
      record[column.key] = updates[column.key];
    }
  });

  var normalized = normalizeCaseRecordForStorage_(record);
  PropertiesService.getScriptProperties().setProperty(
    caseRecordPropertyKey_(caseId),
    JSON.stringify(normalized)
  );
  return normalized;
}

function caseRecordPropertyKey_(caseId) {
  return APP_CONFIG.registryRecordPrefix + String(caseId || '').trim();
}

function normalizeCaseRecordForStorage_(record) {
  var normalized = {};
  CASE_REGISTRY_COLUMNS.forEach(function(column) {
    var value = record[column.key];
    if (value instanceof Date) value = value.toISOString();
    normalized[column.key] = value == null ? '' : value;
  });
  normalized.createdBy = sanitizeActor_(normalized.createdBy);
  normalized.updatedBy = sanitizeActor_(normalized.updatedBy);
  normalized.trashedBy = sanitizeActor_(normalized.trashedBy);
  return normalized;
}

function serializeCaseRecord_(record) {
  return {
    caseId: String(record.caseId || ''),
    caseName: String(record.caseName || ''),
    folderId: String(record.folderId || ''),
    spreadsheetId: String(record.spreadsheetId || ''),
    status: String(record.status || 'ACTIVE'),
    createdAt: dateToIso_(record.createdAt),
    updatedAt: dateToIso_(record.updatedAt),
    createdBy: sanitizeActor_(record.createdBy),
    updatedBy: sanitizeActor_(record.updatedBy),
    schemaVersion: String(record.schemaVersion || ''),
    trashedAt: dateToIso_(record.trashedAt),
    trashedBy: sanitizeActor_(record.trashedBy),
    folderUrl: record.folderId
      ? 'https://drive.google.com/drive/folders/' + record.folderId
      : '',
    spreadsheetUrl: record.spreadsheetId
      ? 'https://docs.google.com/spreadsheets/d/' + record.spreadsheetId + '/edit'
      : ''
  };
}

/**
 * Imports the previous Google Sheets registry once. The old spreadsheet is
 * deliberately retained as a non-destructive backup.
 */
function migrateLegacySheetRegistryIfNeeded_() {
  var properties = PropertiesService.getScriptProperties();
  if (properties.getProperty(APP_CONFIG.registryMigrationKey)) return;

  var legacyId = properties.getProperty(
    APP_CONFIG.scriptPropertyKeys.legacyRegistrySpreadsheetId
  );
  if (legacyId) {
    var records = readLegacySheetRegistry_(legacyId);
    records.forEach(function(record) {
      var caseId = String(record.caseId || '').trim();
      if (!caseId) return;
      var key = caseRecordPropertyKey_(caseId);
      if (!properties.getProperty(key)) {
        properties.setProperty(key, JSON.stringify(normalizeCaseRecordForStorage_(record)));
      }
    });
  }

  properties.setProperty(APP_CONFIG.registryMigrationKey, new Date().toISOString());
}

function readLegacySheetRegistry_(spreadsheetId) {
  try {
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var sheet = spreadsheet.getSheetByName('Cases');
    if (!sheet || sheet.getLastRow() < 2) return [];

    var expectedHeaders = CASE_REGISTRY_COLUMNS.map(function(column) {
      return column.header;
    });
    var headers = sheet
      .getRange(1, 1, 1, expectedHeaders.length)
      .getDisplayValues()[0];
    if (headers.join('|') !== expectedHeaders.join('|')) {
      throw new Error('The previous Case Registry header is not compatible.');
    }

    return sheet
      .getRange(2, 1, sheet.getLastRow() - 1, expectedHeaders.length)
      .getValues()
      .reduce(function(records, row) {
        if (!String(row[0] || '').trim()) return records;
        var record = {};
        CASE_REGISTRY_COLUMNS.forEach(function(column, index) {
          record[column.key] = row[index];
        });
        records.push(record);
        return records;
      }, []);
  } catch (error) {
    throw new Error(
      'The previous Case Registry could not be migrated to Script Properties: ' +
      (error && error.message ? error.message : String(error))
    );
  }
}

function getCurrentUserEmail_() {
  try {
    return sanitizeActor_(Session.getActiveUser().getEmail());
  } catch (error) {
    return '';
  }
}

function sanitizeActor_(value) {
  var actor = String(value || '').trim();
  return /^unknown user$/i.test(actor) ? '' : actor;
}

function dateToMillis_(value) {
  if (value instanceof Date) return value.getTime();
  var parsed = new Date(value || 0).getTime();
  return isFinite(parsed) ? parsed : 0;
}

function dateToIso_(value) {
  if (!value) return '';
  var date = value instanceof Date ? value : new Date(value);
  return isFinite(date.getTime()) ? date.toISOString() : '';
}
