/**
 * General application configuration.
 * Edit this file to change technical names and global rules.
 */
var APP_CONFIG = Object.freeze({
  appName: 'Case Console',
  numberedFolders: ['01', '02', '03', '04'],
  generatedFileSuffix: ' - Form',
  registryFileName: 'Case Registry',
  registrySheetName: 'Cases',
  metadataSheetName: '_CaseMeta',
  schemaVersion: '2.0',
  percentageTolerance: 0.01,
  lockTimeoutMs: 30000,
  maxCaseNameLength: 120,
  scriptPropertyKeys: {
    destinationFolderId: 'DESTINATION_FOLDER_ID',
    templateSpreadsheetId: 'TEMPLATE_SPREADSHEET_ID',
    registrySpreadsheetId: 'CASE_REGISTRY_SPREADSHEET_ID'
  }
});
