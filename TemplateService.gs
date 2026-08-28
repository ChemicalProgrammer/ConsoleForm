/**
 * Copies a Google Sheets template and writes the form according to
 * SHEET_TEMPLATE_MAPPING in TemplateMapping.gs.
 */
function createSpreadsheetFromTemplate_(templateSpreadsheetId, outputFolder, data) {
  var outputName = data.caseName + APP_CONFIG.generatedFileSuffix;
  var copy;

  try {
    var created = Drive.Files.copy(
      {
        name: outputName,
        parents: [outputFolder.getId()]
      },
      templateSpreadsheetId,
      {
        supportsAllDrives: true,
        fields: 'id,name,parents'
      }
    );
    if (
      !created.parents ||
      created.parents.indexOf(outputFolder.getId()) === -1
    ) {
      throw new Error('The copied spreadsheet was not created in 01 Input Data.');
    }
    copy = DriveApp.getFileById(created.id);
  } catch (advancedError) {
    try {
      copy = DriveApp
        .getFileById(templateSpreadsheetId)
        .makeCopy(outputName, outputFolder);
      assertFileInFolder_(copy.getId(), outputFolder.getId());
    } catch (fallbackError) {
      throw new Error(
        'The Google Sheets template could not be copied into 01 Input Data. ' +
        'Verify the Advanced Drive service and Shared Drive permissions.'
      );
    }
  }

  writeCaseDataToSpreadsheet_(copy.getId(), data, { writeCreatedDate: true });
  return copy;
}

function assertFileInFolder_(fileId, folderId) {
  var parents = DriveApp.getFileById(fileId).getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === folderId) return;
  }
  throw new Error('The copied spreadsheet is outside 01 Input Data.');
}

/** Writes all editable Input Data fields to an existing case spreadsheet. */
function writeCaseDataToSpreadsheet_(spreadsheetId, data, options) {
  options = options || {};
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);

  writeMappedCell_(
    spreadsheet,
    SHEET_TEMPLATE_MAPPING.general.caseName,
    asSafeSheetText_(data.caseName),
    'general.caseName'
  );

  if (options.writeCreatedDate && SHEET_TEMPLATE_MAPPING.general.createdDate) {
    writeMappedCell_(
      spreadsheet,
      SHEET_TEMPLATE_MAPPING.general.createdDate,
      new Date(),
      'general.createdDate'
    );
  }

  FORM_SCHEMA.sectionA.fields.forEach(function(field) {
    writeMappedCell_(
      spreadsheet,
      SHEET_TEMPLATE_MAPPING.sectionA[field.id],
      asSafeSheetText_(data.sectionA[field.id]),
      'sectionA.' + field.id
    );
  });

  clearDynamicSection_(spreadsheet, SHEET_TEMPLATE_MAPPING.sectionB, 'sectionB');
  clearDynamicSection_(spreadsheet, SHEET_TEMPLATE_MAPPING.sectionC, 'sectionC');
  writeSectionB_(spreadsheet, data.components);
  writeSectionC_(spreadsheet, data.components);
  writeSectionD_(spreadsheet, data.sectionD);
  SpreadsheetApp.flush();
}

/** Reads current values directly from the case spreadsheet. */
function readCaseFromSpreadsheet_(spreadsheetId, fallbackCaseName) {
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  var sectionA = {};
  var sectionD = {};

  FORM_SCHEMA.sectionA.fields.forEach(function(field) {
    sectionA[field.id] = valueAsText_(readMappedCell_(
      spreadsheet,
      SHEET_TEMPLATE_MAPPING.sectionA[field.id],
      'sectionA.' + field.id
    ));
  });

  FORM_SCHEMA.sectionD.fields.forEach(function(field) {
    var mapping = SHEET_TEMPLATE_MAPPING.sectionD[field.id];
    sectionD[field.id] = {};
    ['min', 'target', 'max'].forEach(function(kind) {
      sectionD[field.id][kind] = valueAsOptionalNumber_(readMappedCell_(
        spreadsheet,
        { sheet: mapping.sheet, cell: mapping[kind] },
        'sectionD.' + field.id + '.' + kind
      ));
    });
  });

  var components = readSectionB_(spreadsheet);
  var characteristicSnapshots = readSectionC_(spreadsheet);
  var database = getComponentMap_();
  components.forEach(function(component) {
    var snapshot = characteristicSnapshots[component.sourceRowIndex];
    component.characteristics = snapshot ? snapshot.characteristics : {};
    component.isCustom = isCustomComponentSnapshot_(component, database[component.code]);
    delete component.sourceRowIndex;
  });

  var mappedCaseName = valueAsText_(readMappedCell_(
    spreadsheet,
    SHEET_TEMPLATE_MAPPING.general.caseName,
    'general.caseName'
  ));

  return {
    caseName: mappedCaseName || String(fallbackCaseName || ''),
    sectionA: sectionA,
    components: components,
    sectionD: sectionD
  };
}

function isCustomComponentSnapshot_(component, databaseComponent) {
  if (!databaseComponent) return true;
  if (String(component.name || '') !== String(databaseComponent.name || '')) return true;

  return FORM_SCHEMA.sectionC.characteristics.some(function(characteristic) {
    var liveValue = component.characteristics[characteristic.id];
    var databaseValue = databaseComponent.characteristics[characteristic.id];
    return String(liveValue == null ? '' : liveValue) !==
      String(databaseValue == null ? '' : databaseValue);
  });
}

function writeSectionB_(spreadsheet, components) {
  var mapping = SHEET_TEMPLATE_MAPPING.sectionB;
  assertRowCapacity_(components.length, mapping, 'B');
  if (!components.length) return;

  var sheet = getMappedSheet_(spreadsheet, mapping.sheet, 'sectionB.sheet');
  writeColumnValues_(sheet, mapping.startRow, mapping.columns.code, components.map(function(item) {
    return asSafeSheetText_(item.code);
  }), 'sectionB.columns.code');
  writeColumnValues_(sheet, mapping.startRow, mapping.columns.name, components.map(function(item) {
    return asSafeSheetText_(item.name);
  }), 'sectionB.columns.name');
  writeColumnValues_(sheet, mapping.startRow, mapping.columns.percentage, components.map(function(item) {
    return mappedPercentage_(item.percentage, mapping.percentageAsDecimal);
  }), 'sectionB.columns.percentage');
}

function writeSectionC_(spreadsheet, components) {
  var mapping = SHEET_TEMPLATE_MAPPING.sectionC;
  assertRowCapacity_(components.length, mapping, 'C');
  if (!components.length) return;

  var sheet = getMappedSheet_(spreadsheet, mapping.sheet, 'sectionC.sheet');
  writeColumnValues_(sheet, mapping.startRow, mapping.columns.code, components.map(function(item) {
    return asSafeSheetText_(item.code);
  }), 'sectionC.columns.code');
  writeColumnValues_(sheet, mapping.startRow, mapping.columns.name, components.map(function(item) {
    return asSafeSheetText_(item.name);
  }), 'sectionC.columns.name');

  if (mapping.columns.percentage) {
    writeColumnValues_(sheet, mapping.startRow, mapping.columns.percentage, components.map(function(item) {
      return mappedPercentage_(item.percentage, mapping.percentageAsDecimal);
    }), 'sectionC.columns.percentage');
  }

  FORM_SCHEMA.sectionC.characteristics.forEach(function(characteristic) {
    writeColumnValues_(
      sheet,
      mapping.startRow,
      mapping.columns.characteristics[characteristic.id],
      components.map(function(item) {
        return asSafeSheetValue_(item.characteristics[characteristic.id]);
      }),
      'sectionC.columns.characteristics.' + characteristic.id
    );
  });
}

function writeSectionD_(spreadsheet, answers) {
  FORM_SCHEMA.sectionD.fields.forEach(function(field) {
    var mapping = SHEET_TEMPLATE_MAPPING.sectionD[field.id];
    var values = answers[field.id];
    ['min', 'target', 'max'].forEach(function(kind) {
      writeMappedCell_(
        spreadsheet,
        { sheet: mapping.sheet, cell: mapping[kind] },
        values[kind],
        'sectionD.' + field.id + '.' + kind
      );
    });
  });
}

function readSectionB_(spreadsheet) {
  var mapping = SHEET_TEMPLATE_MAPPING.sectionB;
  var sheet = getMappedSheet_(spreadsheet, mapping.sheet, 'sectionB.sheet');
  var codes = readColumnValues_(sheet, mapping.startRow, mapping.columns.code, mapping.maxRows);
  var names = readColumnValues_(sheet, mapping.startRow, mapping.columns.name, mapping.maxRows);
  var percentages = readColumnValues_(sheet, mapping.startRow, mapping.columns.percentage, mapping.maxRows);

  return codes.reduce(function(components, value, index) {
    var code = valueAsText_(value);
    var name = valueAsText_(names[index]);
    if (!code && !name) return components;
    components.push({
      code: code,
      name: name,
      percentage: readMappedPercentage_(percentages[index], mapping.percentageAsDecimal),
      sourceRowIndex: index
    });
    return components;
  }, []);
}

function readSectionC_(spreadsheet) {
  var mapping = SHEET_TEMPLATE_MAPPING.sectionC;
  var sheet = getMappedSheet_(spreadsheet, mapping.sheet, 'sectionC.sheet');
  var codes = readColumnValues_(sheet, mapping.startRow, mapping.columns.code, mapping.maxRows);
  var snapshots = [];
  var names = readColumnValues_(sheet, mapping.startRow, mapping.columns.name, mapping.maxRows);
  var characteristicColumns = {};

  FORM_SCHEMA.sectionC.characteristics.forEach(function(characteristic) {
    characteristicColumns[characteristic.id] = readColumnValues_(
      sheet,
      mapping.startRow,
      mapping.columns.characteristics[characteristic.id],
      mapping.maxRows
    );
  });

  codes.forEach(function(value, index) {
    var code = valueAsText_(value);
    var name = valueAsText_(names[index]);
    if (!code && !name) return;
    var characteristics = {};
    FORM_SCHEMA.sectionC.characteristics.forEach(function(characteristic) {
      characteristics[characteristic.id] = characteristicColumns[characteristic.id][index];
    });
    snapshots[index] = {
      code: code,
      name: name,
      characteristics: characteristics
    };
  });
  return snapshots;
}

function clearDynamicSection_(spreadsheet, mapping, mappingPath) {
  var sheet = getMappedSheet_(spreadsheet, mapping.sheet, mappingPath + '.sheet');
  var columns = [mapping.columns.code, mapping.columns.name, mapping.columns.percentage];
  if (mapping.columns.characteristics) {
    Object.keys(mapping.columns.characteristics).forEach(function(key) {
      columns.push(mapping.columns.characteristics[key]);
    });
  }

  var columnNumbers = columns.filter(Boolean).map(function(column) {
    var columnNumber = getColumnNumber_(column);
    if (!columnNumber) throw new Error('Mapping “' + mappingPath + '” contains an invalid column.');
    return columnNumber;
  });
  var firstColumn = Math.min.apply(Math, columnNumbers);
  var lastColumn = Math.max.apply(Math, columnNumbers);
  sheet
    .getRange(mapping.startRow, firstColumn, mapping.maxRows, lastColumn - firstColumn + 1)
    .clearContent();
}

function writeMappedCell_(spreadsheet, target, value, mappingPath) {
  if (!target || !target.sheet || !isA1Cell_(target.cell)) {
    throw new Error('Mapping “' + mappingPath + '” does not contain a valid sheet and cell.');
  }
  var sheet = getMappedSheet_(spreadsheet, target.sheet, mappingPath);
  sheet.getRange(target.cell).setValue(normalizeMappedValue_(value));
}

function readMappedCell_(spreadsheet, target, mappingPath) {
  if (!target || !target.sheet || !isA1Cell_(target.cell)) {
    throw new Error('Mapping “' + mappingPath + '” does not contain a valid sheet and cell.');
  }
  return getMappedSheet_(spreadsheet, target.sheet, mappingPath)
    .getRange(target.cell)
    .getValue();
}

function writeColumnValues_(sheet, startRow, column, values, mappingPath) {
  var columnNumber = getColumnNumber_(column);
  if (!columnNumber || !isPositiveInteger_(startRow)) {
    throw new Error('Mapping “' + mappingPath + '” contains an invalid row or column.');
  }
  sheet.getRange(startRow, columnNumber, values.length, 1).setValues(values.map(function(value) {
    return [normalizeMappedValue_(value)];
  }));
}

function readColumnValues_(sheet, startRow, column, rowCount) {
  var columnNumber = getColumnNumber_(column);
  if (!columnNumber || !isPositiveInteger_(startRow) || !isPositiveInteger_(rowCount)) {
    throw new Error('A template table mapping contains an invalid row or column.');
  }
  return sheet.getRange(startRow, columnNumber, rowCount, 1).getValues().map(function(row) {
    return row[0];
  });
}

function getMappedSheet_(spreadsheet, sheetName, mappingPath) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(
      'Sheet “' + sheetName + '” defined in “' + mappingPath + '” does not exist. ' +
      'Review TemplateMapping.gs and the template.'
    );
  }
  return sheet;
}

function assertRowCapacity_(count, mapping, sectionName) {
  if (!isPositiveInteger_(mapping.startRow) || !isPositiveInteger_(mapping.maxRows)) {
    throw new Error('startRow and maxRows for Section ' + sectionName + ' must be positive integers.');
  }
  if (count > mapping.maxRows) {
    throw new Error(
      'Section ' + sectionName + ' supports up to ' + mapping.maxRows +
      ' components according to TemplateMapping.gs.'
    );
  }
}

function mappedPercentage_(percentage, asDecimal) {
  if (percentage == null || percentage === '') return '';
  return asDecimal ? percentage / 100 : percentage;
}

function readMappedPercentage_(value, asDecimal) {
  var number = valueAsOptionalNumber_(value);
  if (number == null) return null;
  return asDecimal ? number * 100 : number;
}

function normalizeMappedValue_(value) {
  return value == null ? '' : value;
}

function valueAsText_(value) {
  return value == null ? '' : String(value).trim();
}

function valueAsOptionalNumber_(value) {
  if (value == null || value === '') return null;
  var parsed = Number(value);
  return isFinite(parsed) ? parsed : null;
}

function asSafeSheetText_(value) {
  var text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function asSafeSheetValue_(value) {
  if (value == null) return '';
  if (typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) {
    return value;
  }
  return asSafeSheetText_(value);
}

function isA1Cell_(value) {
  return /^\$?[A-Z]+\$?[1-9]\d*$/i.test(String(value || '').trim());
}

function isPositiveInteger_(value) {
  return Number(value) === Math.floor(Number(value)) && Number(value) > 0;
}

function getColumnNumber_(column) {
  if (isPositiveInteger_(column)) return Number(column);
  var letters = String(column || '').trim().toUpperCase();
  if (!/^[A-Z]+$/.test(letters)) return 0;
  var number = 0;
  for (var index = 0; index < letters.length; index += 1) {
    number = number * 26 + letters.charCodeAt(index) - 64;
  }
  return number;
}

/** Stores stable identifiers inside each case spreadsheet for recovery. */
function writeCaseMetadata_(spreadsheetId, metadata) {
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  var sheet = spreadsheet.getSheetByName(APP_CONFIG.metadataSheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(APP_CONFIG.metadataSheetName);

  var rows = [
    ['KEY', 'VALUE'],
    ['caseId', metadata.caseId || ''],
    ['caseName', metadata.caseName || ''],
    ['folderId', metadata.folderId || ''],
    ['spreadsheetId', spreadsheetId],
    ['schemaVersion', metadata.schemaVersion || APP_CONFIG.schemaVersion],
    ['updatedAt', metadata.updatedAt || new Date()]
  ];
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.hideSheet();
}

function readCaseMetadata_(spreadsheetId) {
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  var sheet = spreadsheet.getSheetByName(APP_CONFIG.metadataSheetName);
  if (!sheet || sheet.getLastRow() < 2) return {};

  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues().reduce(function(map, row) {
    var key = String(row[0] || '').trim();
    if (key) map[key] = row[1];
    return map;
  }, {});
}
