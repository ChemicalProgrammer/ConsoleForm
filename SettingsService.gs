/**
 * Returns the global application settings shared by every web-app user.
 * @return {{destinationFolderId:string, templateSpreadsheetId:string}}
 */
function getAppSettings() {
  migrateLegacyUserSettings_();
  var properties = PropertiesService.getScriptProperties();
  return {
    destinationFolderId: properties.getProperty(
      APP_CONFIG.scriptPropertyKeys.destinationFolderId
    ) || '',
    templateSpreadsheetId: properties.getProperty(
      APP_CONFIG.scriptPropertyKeys.templateSpreadsheetId
    ) || ''
  };
}

/** Backwards-compatible alias for installations using the previous name. */
function getUserSettings() {
  return getAppSettings();
}

/**
 * Validates and saves global Drive configuration. Case Registry records are
 * stored in Script Properties, so no additional spreadsheet is required.
 * @param {Object} settings
 * @return {Object}
 */
function saveAppSettings(settings) {
  var lock = LockService.getScriptLock();
  lock.waitLock(APP_CONFIG.lockTimeoutMs);
  try {
    settings = settings || {};
    var destinationFolderId = extractDriveId_(settings.destinationFolderId);
    var templateSpreadsheetId = extractDriveId_(settings.templateSpreadsheetId);

    if (!destinationFolderId || !templateSpreadsheetId) {
      throw new Error(
        'Enter a valid destination folder and Google Sheets template. You may paste a complete URL or ID.'
      );
    }

    var folder = validateDestinationFolder_(destinationFolderId);
    var template = validateGoogleSpreadsheetFile_(
      templateSpreadsheetId,
      'The template could not be opened. Check the ID and your permissions.'
    );

    var properties = PropertiesService.getScriptProperties();
    var values = {};
    values[APP_CONFIG.scriptPropertyKeys.destinationFolderId] = destinationFolderId;
    values[APP_CONFIG.scriptPropertyKeys.templateSpreadsheetId] = templateSpreadsheetId;
    properties.setProperties(values, false);

    // Imports the previous Sheets registry once when upgrading from v2.
    migrateLegacySheetRegistryIfNeeded_();

    return {
      ok: true,
      destinationFolderId: destinationFolderId,
      destinationFolderName: folder.getName(),
      templateSpreadsheetId: templateSpreadsheetId,
      templateSpreadsheetName: template.getName(),
      registryStorage: 'Script Properties'
    };
  } finally {
    lock.releaseLock();
  }
}

/** Backwards-compatible alias for the previous web interface. */
function saveUserSettings(settings) {
  return saveAppSettings(settings);
}

function areSettingsComplete_() {
  var settings = getAppSettings();
  return Boolean(
    settings.destinationFolderId &&
    settings.templateSpreadsheetId
  );
}

function getValidatedSettings_() {
  var settings = getAppSettings();
  if (
    !settings.destinationFolderId ||
    !settings.templateSpreadsheetId
  ) {
    throw new Error(
      'Configure the destination folder and template before using the console.'
    );
  }

  validateDestinationFolder_(settings.destinationFolderId);
  validateGoogleSpreadsheetFile_(
    settings.templateSpreadsheetId,
    'The saved Google Sheets template is no longer accessible.'
  );
  migrateLegacySheetRegistryIfNeeded_();
  return settings;
}

function validateDestinationFolder_(folderId) {
  try {
    var folder = DriveApp.getFolderById(folderId);
    folder.getName();
    return folder;
  } catch (error) {
    throw new Error(
      'The destination folder could not be opened. Check the ID and your permissions.'
    );
  }
}

function validateGoogleSpreadsheetFile_(fileId, inaccessibleMessage) {
  try {
    var file = DriveApp.getFileById(fileId);
    if (file.getMimeType() !== MimeType.GOOGLE_SHEETS) {
      throw new Error('The selected file is not a native Google Sheets file.');
    }
    return file;
  } catch (error) {
    throw new Error(inaccessibleMessage || 'The Google Sheets file could not be opened.');
  }
}

/**
 * Copies destination/template values from the previous per-user installation
 * into global properties once.
 */
function migrateLegacyUserSettings_() {
  var scriptProperties = PropertiesService.getScriptProperties();
  if (
    scriptProperties.getProperty(APP_CONFIG.scriptPropertyKeys.destinationFolderId) ||
    scriptProperties.getProperty(APP_CONFIG.scriptPropertyKeys.templateSpreadsheetId)
  ) {
    return;
  }

  var legacy = PropertiesService.getUserProperties();
  var destination = legacy.getProperty('DESTINATION_FOLDER_ID');
  var template = legacy.getProperty('TEMPLATE_SPREADSHEET_ID');
  if (!destination || !template) return;

  var values = {};
  values[APP_CONFIG.scriptPropertyKeys.destinationFolderId] = destination;
  values[APP_CONFIG.scriptPropertyKeys.templateSpreadsheetId] = template;
  scriptProperties.setProperties(values, false);
}

function extractDriveId_(value) {
  var text = String(value || '').trim();
  var match = text.match(/[-\w]{20,}/);
  return match ? match[0] : '';
}
