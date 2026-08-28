/**
 * Column order for the central Case Registry spreadsheet.
 * The registry contains only metadata; form answers remain in each case file.
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

/** Creates a native Google Sheets registry inside the configured folder. */
function createRegistrySpreadsheet_(destinationFolderId) {
  var metadata = {
    name: APP_CONFIG.registryFileName,
    mimeType: 'application/vnd.google-apps.spreadsheet',
    parents: [destinationFolderId]
  };

  try {
    var created = Drive.Files.create(metadata, null, {
      supportsAllDrives: true,
      fields: 'id,name'
    });
    return created.id;
  } catch (advancedError) {
    // Fallback supports My Drive installations if the advanced service has not
    // yet been enabled. Shared Drives should use the configured Drive service.
    try {
      var spreadsheet = SpreadsheetApp.create(APP_CONFIG.registryFileName);
      var file = DriveApp.getFileById(spreadsheet.getId());
      file.moveTo(DriveApp.getFolderById(destinationFolderId));
      return spreadsheet.getId();
    } catch (fallbackError) {
      throw new Error(
        'The Case Registry could not be created. Enable the Advanced Drive service and verify Shared Drive permissions.'
      );
    }
  }
}

/** Ensures the Cases sheet and its fixed header are present. */
function initializeRegistry_(registrySpreadsheetId) {
  var spreadsheet = SpreadsheetApp.openById(registrySpreadsheetId);
  var sheet = spreadsheet.getSheetByName(APP_CONFIG.registrySheetName);
  var createdHeader = false;

  if (!sheet) {
    var sheets = spreadsheet.getSheets();
    if (sheets.length === 1 && sheets[0].getLastRow() === 0) {
      sheet = sheets[0];
      sheet.setName(APP_CONFIG.registrySheetName);
    } else {
      sheet = spreadsheet.insertSheet(APP_CONFIG.registrySheetName);
    }
  }

  var headers = CASE_REGISTRY_COLUMNS.map(function(column) {
    return column.header;
  });
  var currentHeaders = sheet
    .getRange(1, 1, 1, headers.length)
    .getDisplayValues()[0];

  if (currentHeaders.join('|') !== headers.join('|')) {
    if (sheet.getLastRow() > 1 || currentHeaders.some(Boolean)) {
      throw new Error(
        'The Case Registry header does not match the expected structure. Use a blank spreadsheet or restore the documented columns.'
      );
    }
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    createdHeader = true;
  }

  if (createdHeader) {
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setFontColor('#ffffff')
      .setBackground('#4f46e5');
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

function getRegistrySheet_() {
  var settings = getAppSettings();
  if (!settings.registrySpreadsheetId) {
    throw new Error('The Case Registry has not been configured.');
  }
  return initializeRegistry_(settings.registrySpreadsheetId);
}

function getAllCaseRecords_() {
  var sheet = getRegistrySheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet
    .getRange(2, 1, lastRow - 1, CASE_REGISTRY_COLUMNS.length)
    .getValues();

  return values.reduce(function(records, row, index) {
    if (!String(row[0] || '').trim()) return records;
    var record = { _rowNumber: index + 2 };
    CASE_REGISTRY_COLUMNS.forEach(function(column, columnIndex) {
      record[column.key] = row[columnIndex];
    });
    records.push(record);
    return records;
  }, []);
}

function findCaseRecordById_(caseId) {
  var normalizedId = String(caseId || '').trim();
  if (!normalizedId) throw new Error('A valid case ID is required.');

  var record = getAllCaseRecords_().find(function(item) {
    return String(item.caseId) === normalizedId;
  });
  if (!record) throw new Error('The requested case was not found in the registry.');
  return record;
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
  var sheet = getRegistrySheet_();
  sheet.appendRow(caseRecordToRow_(record));
  return findCaseRecordById_(record.caseId);
}

function updateCaseRecord_(caseId, updates) {
  var record = findCaseRecordById_(caseId);
  updates = updates || {};
  CASE_REGISTRY_COLUMNS.forEach(function(column) {
    if (Object.prototype.hasOwnProperty.call(updates, column.key)) {
      record[column.key] = updates[column.key];
    }
  });

  var sheet = getRegistrySheet_();
  sheet
    .getRange(record._rowNumber, 1, 1, CASE_REGISTRY_COLUMNS.length)
    .setValues([caseRecordToRow_(record)]);
  return findCaseRecordById_(caseId);
}

function caseRecordToRow_(record) {
  return CASE_REGISTRY_COLUMNS.map(function(column) {
    var value = record[column.key];
    return value == null ? '' : value;
  });
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
    createdBy: String(record.createdBy || ''),
    updatedBy: String(record.updatedBy || ''),
    schemaVersion: String(record.schemaVersion || ''),
    trashedAt: dateToIso_(record.trashedAt),
    trashedBy: String(record.trashedBy || ''),
    folderUrl: record.folderId
      ? 'https://drive.google.com/drive/folders/' + record.folderId
      : '',
    spreadsheetUrl: record.spreadsheetId
      ? 'https://docs.google.com/spreadsheets/d/' + record.spreadsheetId + '/edit'
      : ''
  };
}

function getCurrentUserEmail_() {
  try {
    return Session.getActiveUser().getEmail() || 'Unknown user';
  } catch (error) {
    return 'Unknown user';
  }
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
