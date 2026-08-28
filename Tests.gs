/**
 * Structural self-test that does not create or modify Drive files.
 * Run it from the Apps Script editor before deployment.
 * @return {Object}
 */
function runProjectSelfTest() {
  var errors = [];
  var sectionAFields = FORM_SCHEMA.sectionA.fields;
  var sectionCFields = FORM_SCHEMA.sectionC.characteristics;
  var sectionDFields = FORM_SCHEMA.sectionD.fields;

  assertTest_(sectionAFields.length === 9, 'Section A must have 9 fields after removing the duplicate case title.', errors);
  assertTest_(
    sectionAFields.filter(function(field) { return field.type === 'text'; }).length === 0,
    'Section A must not repeat the case title as a short-response field.',
    errors
  );
  assertTest_(
    sectionAFields.filter(function(field) { return field.type === 'textarea'; }).length === 2,
    'Section A must have 2 long-response fields.',
    errors
  );
  assertTest_(
    sectionAFields.filter(function(field) { return field.type === 'select'; }).length === 7,
    'Section A must have 7 dropdown fields.',
    errors
  );
  assertTest_(sectionCFields.length === 15, 'Section C must define 15 characteristics.', errors);
  assertTest_(sectionDFields.length === 11, 'Section D must define 11 parameters.', errors);
  assertTest_(APP_CONFIG.numberedFolders.join(',') === '01,02,03,04', 'The folder structure must contain 01–04.', errors);
  assertTest_(APP_CONFIG.appName === 'Case Console', 'The application must open as Case Console.', errors);
  assertTest_(Boolean(APP_CONFIG.registrySheetName), 'A registry sheet name is required.', errors);
  assertTest_(Boolean(APP_CONFIG.metadataSheetName), 'A case metadata sheet name is required.', errors);
  assertTest_(
    CASE_REGISTRY_COLUMNS.map(function(column) { return column.header; }).join(',') ===
      'CASE_ID,CASE_NAME,FOLDER_ID,SPREADSHEET_ID,STATUS,CREATED_AT,UPDATED_AT,CREATED_BY,UPDATED_BY,SCHEMA_VERSION,TRASHED_AT,TRASHED_BY',
    'The Case Registry columns do not match the console schema.',
    errors
  );
  assertTest_(
    sectionAFields.every(function(field) { return field.required === false; }),
    'Every Section A field must be optional.',
    errors
  );
  validateTemplateMappingForTest_(errors);
  validateTitleOnlySubmissionForTest_(errors);

  var componentCodes = {};
  COMPONENT_DATABASE.forEach(function(component) {
    assertTest_(!componentCodes[component.code], 'Duplicate component code: ' + component.code, errors);
    componentCodes[component.code] = true;
    sectionCFields.forEach(function(characteristic) {
      assertTest_(
        Object.prototype.hasOwnProperty.call(component.characteristics, characteristic.id),
        component.code + ' does not contain ' + characteristic.id + '.',
        errors
      );
    });
  });

  var result = {
    ok: errors.length === 0,
    tests: {
      sectionAFields: sectionAFields.length,
      sectionCCharacteristics: sectionCFields.length,
      sectionDParameters: sectionDFields.length,
      numberedFolders: APP_CONFIG.numberedFolders.length,
      components: COMPONENT_DATABASE.length,
      registryColumns: CASE_REGISTRY_COLUMNS.length,
      mappedSectionAFields: Object.keys(SHEET_TEMPLATE_MAPPING.sectionA || {}).length,
      mappedSectionCCharacteristics: Object.keys(
        (SHEET_TEMPLATE_MAPPING.sectionC.columns || {}).characteristics || {}
      ).length,
      mappedSectionDFields: Object.keys(SHEET_TEMPLATE_MAPPING.sectionD || {}).length
    },
    errors: errors
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

function validateTitleOnlySubmissionForTest_(errors) {
  var normalized;
  try {
    normalized = validateAndNormalizePayload_({
      caseName: 'Title-only test case',
      sectionA: {},
      components: [{ code: '', percentage: '' }],
      sectionD: {}
    });
  } catch (error) {
    errors.push('A title-only submission must be accepted: ' + error.message);
    return;
  }

  assertTest_(
    normalized.components.length === 0,
    'A blank component row must be ignored.',
    errors
  );
  assertTest_(
    normalized.sectionD.D1.min === null &&
      normalized.sectionD.D1.target === null &&
      normalized.sectionD.D1.max === null,
    'Blank Section D values must normalize to null.',
    errors
  );
}

function validateTemplateMappingForTest_(errors) {
  var mapping = SHEET_TEMPLATE_MAPPING || {};
  assertMappedCellForTest_(mapping.general && mapping.general.caseName, 'general.caseName', errors);
  if (mapping.general && mapping.general.createdDate) {
    assertMappedCellForTest_(mapping.general.createdDate, 'general.createdDate', errors);
  }

  FORM_SCHEMA.sectionA.fields.forEach(function(field) {
    assertMappedCellForTest_(
      mapping.sectionA && mapping.sectionA[field.id],
      'sectionA.' + field.id,
      errors
    );
  });

  ['sectionB', 'sectionC'].forEach(function(sectionKey) {
    var dynamicMapping = mapping[sectionKey] || {};
    assertTest_(Boolean(dynamicMapping.sheet), sectionKey + '.sheet is required.', errors);
    assertTest_(isPositiveInteger_(dynamicMapping.startRow), sectionKey + '.startRow must be a positive integer.', errors);
    assertTest_(isPositiveInteger_(dynamicMapping.maxRows), sectionKey + '.maxRows must be a positive integer.', errors);
    ['code', 'name', 'percentage'].forEach(function(columnKey) {
      assertTest_(
        getColumnNumber_((dynamicMapping.columns || {})[columnKey]) > 0,
        sectionKey + '.columns.' + columnKey + ' is not a valid column.',
        errors
      );
    });
  });

  FORM_SCHEMA.sectionC.characteristics.forEach(function(characteristic) {
    var characteristicColumns = (
      (mapping.sectionC || {}).columns || {}
    ).characteristics || {};
    assertTest_(
      getColumnNumber_(characteristicColumns[characteristic.id]) > 0,
      'sectionC.columns.characteristics.' + characteristic.id + ' is not a valid column.',
      errors
    );
  });

  FORM_SCHEMA.sectionD.fields.forEach(function(field) {
    var fieldMapping = mapping.sectionD && mapping.sectionD[field.id];
    ['min', 'target', 'max'].forEach(function(kind) {
      assertMappedCellForTest_(
        fieldMapping && { sheet: fieldMapping.sheet, cell: fieldMapping[kind] },
        'sectionD.' + field.id + '.' + kind,
        errors
      );
    });
  });

  assertTest_(getColumnNumber_('A') === 1, 'Column A conversion failed.', errors);
  assertTest_(getColumnNumber_('AA') === 27, 'Column AA conversion failed.', errors);
}

function assertMappedCellForTest_(target, path, errors) {
  assertTest_(Boolean(target && target.sheet), path + ' must define sheet.', errors);
  assertTest_(Boolean(target && isA1Cell_(target.cell)), path + ' must define a valid A1 cell.', errors);
}

function assertTest_(condition, message, errors) {
  if (!condition) errors.push(message);
}
