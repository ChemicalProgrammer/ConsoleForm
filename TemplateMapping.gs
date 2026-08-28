/**
 * EDITABLE GOOGLE SHEETS TEMPLATE MAPPING
 *
 * Edit this file to define where every form value is written. Sheet names
 * must exactly match the template, and individual cells use A1 notation.
 *
 * The case title is captured once above the form sections and is written using
 * general.caseName. Sections B and C support any number of components: each
 * component occupies one row beginning at startRow.
 *
 * Column mappings accept letters ("A", "B", "AA") or numbers (1, 2, 27).
 * When percentageAsDecimal is true, 25% is written as 0.25.
 */
var SHEET_TEMPLATE_MAPPING = Object.freeze({
  general: {
    caseName: { sheet: 'Form', cell: 'B2' },
    createdDate: { sheet: 'Form', cell: 'B3' }
  },

  sectionA: {
    A_LONG_1: { sheet: 'Form', cell: 'B6' },
    A_LONG_2: { sheet: 'Form', cell: 'B7' },
    A_COMBO_1: { sheet: 'Form', cell: 'B9' },
    A_COMBO_2: { sheet: 'Form', cell: 'B10' },
    A_COMBO_3: { sheet: 'Form', cell: 'B11' },
    A_COMBO_4: { sheet: 'Form', cell: 'B12' },
    A_COMBO_5: { sheet: 'Form', cell: 'B13' },
    A_COMBO_6: { sheet: 'Form', cell: 'B14' },
    A_COMBO_7: { sheet: 'Form', cell: 'B15' }
  },

  sectionB: {
    sheet: 'Components',
    startRow: 3,
    maxRows: 50,
    percentageAsDecimal: true,
    columns: {
      code: 'A',
      name: 'B',
      percentage: 'C'
    }
  },

  sectionC: {
    sheet: 'Characteristics',
    startRow: 3,
    maxRows: 50,
    percentageAsDecimal: true,
    columns: {
      code: 'A',
      name: 'B',
      percentage: 'C',
      characteristics: {
        C1: 'D',
        C2: 'E',
        C3: 'F',
        C4: 'G',
        C5: 'H',
        C6: 'I',
        C7: 'J',
        C8: 'K',
        C9: 'L',
        C10: 'M',
        C11: 'N',
        C12: 'O',
        C13: 'P',
        C14: 'Q',
        C15: 'R'
      }
    }
  },

  sectionD: {
    D1: { sheet: 'Form', min: 'B20', target: 'C20', max: 'D20' },
    D2: { sheet: 'Form', min: 'B21', target: 'C21', max: 'D21' },
    D3: { sheet: 'Form', min: 'B22', target: 'C22', max: 'D22' },
    D4: { sheet: 'Form', min: 'B23', target: 'C23', max: 'D23' },
    D5: { sheet: 'Form', min: 'B24', target: 'C24', max: 'D24' },
    D6: { sheet: 'Form', min: 'B25', target: 'C25', max: 'D25' },
    D7: { sheet: 'Form', min: 'B26', target: 'C26', max: 'D26' },
    D8: { sheet: 'Form', min: 'B27', target: 'C27', max: 'D27' },
    D9: { sheet: 'Form', min: 'B28', target: 'C28', max: 'D28' },
    D10: { sheet: 'Form', min: 'B29', target: 'C29', max: 'D29' },
    D11: { sheet: 'Form', min: 'B30', target: 'C30', max: 'D30' }
  }
});

function getTemplateMapping() {
  return JSON.parse(JSON.stringify(SHEET_TEMPLATE_MAPPING));
}
