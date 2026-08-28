/** Returns registry metadata for the dashboard. */
function listCases(options) {
  options = options || {};
  getValidatedSettings_();
  return listCaseRecords_(Boolean(options.includeTrashed)).map(serializeCaseRecord_);
}

/** Returns live Input Data read directly from the case Google Sheets file. */
function getCase(caseId) {
  var settings = getValidatedSettings_();
  var record = findCaseRecordById_(caseId);
  assertActiveCase_(record);
  assertCaseFolderInDestination_(record.folderId, settings.destinationFolderId);

  return {
    ok: true,
    case: serializeCaseRecord_(record),
    data: readCaseFromSpreadsheet_(record.spreadsheetId, record.caseName),
    reports: []
  };
}

/** Creates a case, its folders, spreadsheet copy, metadata, and registry row. */
function createCase(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(APP_CONFIG.lockTimeoutMs);

  var caseFolder = null;
  try {
    var settings = getValidatedSettings_();
    var normalized = validateAndNormalizePayload_(payload);
    var structure = createCaseFolderStructure_(
      settings.destinationFolderId,
      normalized.caseName
    );
    caseFolder = structure.caseFolder;

    var generatedFile = createSpreadsheetFromTemplate_(
      settings.templateSpreadsheetId,
      structure.inputFolder,
      normalized
    );

    var now = new Date();
    var user = getCurrentUserEmail_();
    var record = {
      caseId: Utilities.getUuid(),
      caseName: normalized.caseName,
      folderId: caseFolder.getId(),
      spreadsheetId: generatedFile.getId(),
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: user,
      updatedBy: user,
      schemaVersion: APP_CONFIG.schemaVersion,
      trashedAt: '',
      trashedBy: ''
    };

    writeCaseMetadata_(record.spreadsheetId, record);
    var savedRecord = appendCaseRecord_(record);
    var serialized = serializeCaseRecord_(savedRecord);

    return {
      ok: true,
      case: serialized,
      caseId: serialized.caseId,
      caseName: serialized.caseName,
      caseFolderUrl: serialized.folderUrl,
      spreadsheetUrl: serialized.spreadsheetUrl,
      spreadsheetName: generatedFile.getName()
    };
  } catch (error) {
    if (caseFolder) {
      try {
        moveDriveItemToTrash_(caseFolder.getId());
      } catch (cleanupError) {
        console.error('The incomplete folder could not be cleaned up: ' + cleanupError.message);
      }
    }
    throw new Error(error && error.message ? error.message : String(error));
  } finally {
    lock.releaseLock();
  }
}

/** Backwards-compatible alias for the previous form-only web app. */
function submitCase(payload) {
  return createCase(payload);
}

/** Updates mapped cells. Changing the title also renames folder and file. */
function updateCase(caseId, payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(APP_CONFIG.lockTimeoutMs);

  var renamed = false;
  var record;
  try {
    var settings = getValidatedSettings_();
    record = findCaseRecordById_(caseId);
    assertActiveCase_(record);
    assertExpectedVersion_(record, payload && payload.expectedUpdatedAt);
    var normalized = validateAndNormalizePayload_(payload);
    var oldCaseName = String(record.caseName);

    if (normalized.caseName !== oldCaseName) {
      renameCaseAssets_(record, normalized.caseName, settings.destinationFolderId);
      renamed = true;
    }

    writeCaseDataToSpreadsheet_(record.spreadsheetId, normalized, {
      writeCreatedDate: false
    });

    var now = new Date();
    var recordUpdates = {
      caseName: normalized.caseName,
      updatedAt: now,
      updatedBy: getCurrentUserEmail_(),
      schemaVersion: APP_CONFIG.schemaVersion
    };
    writeCaseMetadata_(
      record.spreadsheetId,
      copyCaseRecordWithUpdates_(record, recordUpdates)
    );
    var updated = updateCaseRecord_(caseId, recordUpdates);

    return {
      ok: true,
      case: serializeCaseRecord_(updated),
      data: normalized
    };
  } catch (error) {
    if (renamed && record) {
      try {
        renameCaseAssets_(record, String(record.caseName), getAppSettings().destinationFolderId);
        writeMappedCell_(
          SpreadsheetApp.openById(record.spreadsheetId),
          SHEET_TEMPLATE_MAPPING.general.caseName,
          asSafeSheetText_(record.caseName),
          'general.caseName'
        );
        writeCaseMetadata_(record.spreadsheetId, record);
      } catch (rollbackError) {
        console.error('Rename rollback failed: ' + rollbackError.message);
      }
    }
    throw new Error(error && error.message ? error.message : String(error));
  } finally {
    lock.releaseLock();
  }
}

/** Renames only the case folder, copied spreadsheet, mapped title, and registry. */
function renameCase(caseId, newCaseName) {
  var lock = LockService.getScriptLock();
  lock.waitLock(APP_CONFIG.lockTimeoutMs);

  var record;
  var assetsRenamed = false;
  try {
    var settings = getValidatedSettings_();
    record = findCaseRecordById_(caseId);
    assertActiveCase_(record);
    var normalizedName = normalizeCaseName_(newCaseName);
    if (normalizedName === String(record.caseName)) {
      return { ok: true, case: serializeCaseRecord_(record) };
    }

    renameCaseAssets_(record, normalizedName, settings.destinationFolderId);
    assetsRenamed = true;
    writeMappedCell_(
      SpreadsheetApp.openById(record.spreadsheetId),
      SHEET_TEMPLATE_MAPPING.general.caseName,
      asSafeSheetText_(normalizedName),
      'general.caseName'
    );

    var recordUpdates = {
      caseName: normalizedName,
      updatedAt: new Date(),
      updatedBy: getCurrentUserEmail_()
    };
    writeCaseMetadata_(
      record.spreadsheetId,
      copyCaseRecordWithUpdates_(record, recordUpdates)
    );
    var updated = updateCaseRecord_(caseId, recordUpdates);
    return { ok: true, case: serializeCaseRecord_(updated) };
  } catch (error) {
    if (assetsRenamed && record) {
      try {
        renameCaseAssets_(record, String(record.caseName), getAppSettings().destinationFolderId);
        writeMappedCell_(
          SpreadsheetApp.openById(record.spreadsheetId),
          SHEET_TEMPLATE_MAPPING.general.caseName,
          asSafeSheetText_(record.caseName),
          'general.caseName'
        );
        writeCaseMetadata_(record.spreadsheetId, record);
      } catch (rollbackError) {
        console.error('Rename rollback failed: ' + rollbackError.message);
      }
    }
    throw new Error(error && error.message ? error.message : String(error));
  } finally {
    lock.releaseLock();
  }
}

/** Moves a complete case folder to trash after exact-title confirmation. */
function trashCase(caseId, confirmationName) {
  var lock = LockService.getScriptLock();
  lock.waitLock(APP_CONFIG.lockTimeoutMs);

  var record;
  var moved = false;
  try {
    var settings = getValidatedSettings_();
    record = findCaseRecordById_(caseId);
    assertActiveCase_(record);
    if (String(confirmationName || '').trim() !== String(record.caseName)) {
      throw new Error('Type the exact case name to confirm this action.');
    }

    assertCaseFolderInDestination_(record.folderId, settings.destinationFolderId);
    moveDriveItemToTrash_(record.folderId);
    moved = true;
    var updated = updateCaseRecord_(caseId, {
      status: 'TRASHED',
      updatedAt: new Date(),
      updatedBy: getCurrentUserEmail_(),
      trashedAt: new Date(),
      trashedBy: getCurrentUserEmail_()
    });
    return { ok: true, case: serializeCaseRecord_(updated) };
  } catch (error) {
    if (moved && record) {
      try {
        restoreDriveItem_(record.folderId);
      } catch (rollbackError) {
        console.error('Trash rollback failed: ' + rollbackError.message);
      }
    }
    throw new Error(error && error.message ? error.message : String(error));
  } finally {
    lock.releaseLock();
  }
}

/** Restores a recoverable case from Drive trash. */
function restoreCase(caseId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(APP_CONFIG.lockTimeoutMs);
  try {
    getValidatedSettings_();
    var record = findCaseRecordById_(caseId);
    if (String(record.status) !== 'TRASHED') {
      throw new Error('Only trashed cases can be restored.');
    }

    var duplicateActive = getAllCaseRecords_().some(function(item) {
      return item.caseId !== record.caseId &&
        String(item.status) === 'ACTIVE' &&
        String(item.caseName).toLowerCase() === String(record.caseName).toLowerCase();
    });
    if (duplicateActive) {
      throw new Error('Rename the active case with the same title before restoring this case.');
    }

    restoreDriveItem_(record.folderId);
    var updated = updateCaseRecord_(caseId, {
      status: 'ACTIVE',
      updatedAt: new Date(),
      updatedBy: getCurrentUserEmail_(),
      trashedAt: '',
      trashedBy: ''
    });
    return { ok: true, case: serializeCaseRecord_(updated) };
  } finally {
    lock.releaseLock();
  }
}

/**
 * One-time import for cases created by the previous version. It scans only the
 * configured destination folder and never modifies mapped form cells.
 */
function migrateExistingCases() {
  var lock = LockService.getScriptLock();
  lock.waitLock(APP_CONFIG.lockTimeoutMs);
  try {
    var settings = getValidatedSettings_();
    var destination = DriveApp.getFolderById(settings.destinationFolderId);
    var folders = destination.getFolders();
    var existingRecords = getAllCaseRecords_();
    var registeredFolderIds = {};
    var registeredCaseIds = {};
    existingRecords.forEach(function(record) {
      registeredFolderIds[String(record.folderId)] = true;
      registeredCaseIds[String(record.caseId)] = true;
    });
    var imported = 0;
    var skipped = 0;
    var errors = [];

    while (folders.hasNext()) {
      var folder = folders.next();
      if (registeredFolderIds[folder.getId()]) {
        skipped += 1;
        continue;
      }

      try {
        var spreadsheetFile = findCaseSpreadsheet_(folder);
        if (!spreadsheetFile) {
          skipped += 1;
          continue;
        }

        var existingMetadata = readCaseMetadata_(spreadsheetFile.getId());
        readCaseFromSpreadsheet_(spreadsheetFile.getId(), folder.getName());
        var now = new Date();
        var user = getCurrentUserEmail_();
        var recoveredCaseId = String(existingMetadata.caseId || '');
        if (!recoveredCaseId || registeredCaseIds[recoveredCaseId]) {
          recoveredCaseId = Utilities.getUuid();
        }
        var record = {
          caseId: recoveredCaseId,
          caseName: folder.getName(),
          folderId: folder.getId(),
          spreadsheetId: spreadsheetFile.getId(),
          status: 'ACTIVE',
          createdAt: getDriveDateOrFallback_(folder, 'getDateCreated', now),
          updatedAt: getDriveDateOrFallback_(folder, 'getLastUpdated', now),
          createdBy: user,
          updatedBy: user,
          schemaVersion: APP_CONFIG.schemaVersion,
          trashedAt: '',
          trashedBy: ''
        };
        appendCaseRecord_(record);
        writeCaseMetadata_(record.spreadsheetId, record);
        registeredFolderIds[record.folderId] = true;
        registeredCaseIds[record.caseId] = true;
        imported += 1;
      } catch (caseError) {
        errors.push(folder.getName() + ': ' + caseError.message);
      }
    }

    return {
      ok: errors.length === 0,
      imported: imported,
      skipped: skipped,
      errors: errors.slice(0, 10)
    };
  } finally {
    lock.releaseLock();
  }
}

function assertActiveCase_(record) {
  if (String(record.status) !== 'ACTIVE') {
    throw new Error('This case is in trash. Restore it before opening or editing it.');
  }
}

function assertExpectedVersion_(record, expectedUpdatedAt) {
  if (!expectedUpdatedAt) return;
  if (dateToIso_(record.updatedAt) !== String(expectedUpdatedAt)) {
    throw new Error(
      'This case was modified by another user. Reload it from the spreadsheet before saving.'
    );
  }
}

function getDriveDateOrFallback_(item, methodName, fallback) {
  try {
    var value = item[methodName]();
    return value instanceof Date ? value : fallback;
  } catch (error) {
    return fallback;
  }
}

function copyCaseRecordWithUpdates_(record, updates) {
  var copy = {};
  CASE_REGISTRY_COLUMNS.forEach(function(column) {
    copy[column.key] = record[column.key];
  });
  Object.keys(updates || {}).forEach(function(key) {
    copy[key] = updates[key];
  });
  return copy;
}
