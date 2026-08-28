/** Creates the case folder and its four numbered subfolders. */
function createCaseFolderStructure_(destinationFolderId, caseName) {
  assertUniqueCaseFolderName_(destinationFolderId, caseName, '');
  var destination = DriveApp.getFolderById(destinationFolderId);
  var caseFolder = destination.createFolder(caseName);
  var numberedFolders = {};

  APP_CONFIG.numberedFolders.forEach(function(folderName) {
    numberedFolders[folderName] = caseFolder.createFolder(folderName);
  });

  return {
    caseFolder: caseFolder,
    numberedFolders: numberedFolders,
    inputFolder: numberedFolders[APP_CONFIG.inputFolderName]
  };
}

function assertUniqueCaseFolderName_(destinationFolderId, caseName, excludedFolderId) {
  var matches = DriveApp.getFolderById(destinationFolderId).getFoldersByName(caseName);
  while (matches.hasNext()) {
    var folder = matches.next();
    if (folder.getId() !== String(excludedFolderId || '')) {
      throw new Error(
        'A folder named “' + caseName + '” already exists in the destination folder.'
      );
    }
  }
}

/** Prevents browser-supplied IDs from targeting folders outside the root. */
function assertCaseFolderInDestination_(caseFolderId, destinationFolderId) {
  var folder = DriveApp.getFolderById(caseFolderId);
  var parents = folder.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === destinationFolderId) return folder;
  }
  throw new Error('The case folder is not inside the configured destination folder.');
}

function renameCaseAssets_(record, newCaseName, destinationFolderId) {
  assertCaseFolderInDestination_(record.folderId, destinationFolderId);
  assertUniqueCaseFolderName_(destinationFolderId, newCaseName, record.folderId);
  DriveApp.getFolderById(record.folderId).setName(newCaseName);
  DriveApp.getFileById(record.spreadsheetId)
    .setName(newCaseName + APP_CONFIG.generatedFileSuffix);
}

/** Moves an item to trash with Shared Drive support. */
function moveDriveItemToTrash_(itemId) {
  try {
    Drive.Files.update(
      { trashed: true },
      itemId,
      { supportsAllDrives: true, fields: 'id,trashed' }
    );
  } catch (advancedError) {
    try {
      DriveApp.getFolderById(itemId).setTrashed(true);
    } catch (fallbackError) {
      throw new Error(
        'The case could not be moved to trash. Verify your Shared Drive role and the Advanced Drive service.'
      );
    }
  }
}

/** Restores an item from trash with Shared Drive support. */
function restoreDriveItem_(itemId) {
  try {
    Drive.Files.update(
      { trashed: false },
      itemId,
      { supportsAllDrives: true, fields: 'id,trashed' }
    );
  } catch (advancedError) {
    try {
      DriveApp.getFolderById(itemId).setTrashed(false);
    } catch (fallbackError) {
      throw new Error(
        'The case could not be restored. Verify your Shared Drive role and the Advanced Drive service.'
      );
    }
  }
}

function findNumberedSubfolder_(caseFolder, folderName) {
  var matches = caseFolder.getFoldersByName(folderName);
  return matches.hasNext() ? matches.next() : null;
}

function findCaseSpreadsheet_(caseFolder) {
  var folder01 = findNumberedSubfolder_(caseFolder, APP_CONFIG.inputFolderName);
  if (!folder01) {
    (APP_CONFIG.legacyInputFolderNames || []).some(function(folderName) {
      folder01 = findNumberedSubfolder_(caseFolder, folderName);
      return Boolean(folder01);
    });
  }
  if (!folder01) return null;

  var files = folder01.getFilesByType(MimeType.GOOGLE_SHEETS);
  var fallback = null;
  while (files.hasNext()) {
    var file = files.next();
    if (!fallback) fallback = file;
    if (file.getName().slice(-APP_CONFIG.generatedFileSuffix.length) === APP_CONFIG.generatedFileSuffix) {
      return file;
    }
  }
  return fallback;
}
