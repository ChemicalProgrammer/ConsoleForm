/**
 * General application configuration.
 * Edit this file to change technical names and global rules.
 */
var APP_CONFIG = Object.freeze({
  appName: 'Case Console',
  inputFolderName: '01 Input Data',
  legacyInputFolderNames: ['01'],
  numberedFolders: ['01 Input Data', '02', '03', '04'],
  generatedFileSuffix: ' - Form',
  metadataSheetName: '_CaseMeta',
  schemaVersion: '3.0',
  percentageTolerance: 0.01,
  lockTimeoutMs: 30000,
  maxCaseNameLength: 120,
  registryRecordPrefix: 'CASE_RECORD__',
  registryMigrationKey: 'CASE_REGISTRY_PROPERTIES_MIGRATED_V3',
  scriptPropertyKeys: {
    destinationFolderId: 'DESTINATION_FOLDER_ID',
    templateSpreadsheetId: 'TEMPLATE_SPREADSHEET_ID',
    legacyRegistrySpreadsheetId: 'CASE_REGISTRY_SPREADSHEET_ID'
  }
});
