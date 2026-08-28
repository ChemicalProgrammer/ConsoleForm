/**
 * Editable form field definitions.
 *
 * The case title is captured once above the sections and is not repeated in
 * Section A. All fields in Sections A through D are optional.
 */
var FORM_SCHEMA = Object.freeze({
  sectionA: {
    title: 'A. General information',
    description: 'Provide any available general information. All fields are optional.',
    fields: [
      {
        id: 'A_LONG_1',
        label: 'Long response 1',
        type: 'textarea',
        placeholder: 'Enter the available information',
        required: false
      },
      {
        id: 'A_LONG_2',
        label: 'Long response 2',
        type: 'textarea',
        placeholder: 'Add any relevant details',
        required: false
      },
      {
        id: 'A_COMBO_1',
        label: 'Option 1',
        type: 'select',
        options: ['Option A', 'Option B', 'Option C'],
        required: false
      },
      {
        id: 'A_COMBO_2',
        label: 'Option 2',
        type: 'select',
        options: ['Option A', 'Option B', 'Option C'],
        required: false
      },
      {
        id: 'A_COMBO_3',
        label: 'Option 3',
        type: 'select',
        options: ['Option A', 'Option B', 'Option C'],
        required: false
      },
      {
        id: 'A_COMBO_4',
        label: 'Option 4',
        type: 'select',
        options: ['Option A', 'Option B', 'Option C'],
        required: false
      },
      {
        id: 'A_COMBO_5',
        label: 'Option 5',
        type: 'select',
        options: ['Option A', 'Option B', 'Option C'],
        required: false
      },
      {
        id: 'A_COMBO_6',
        label: 'Option 6',
        type: 'select',
        options: ['Option A', 'Option B', 'Option C'],
        required: false
      },
      {
        id: 'A_COMBO_7',
        label: 'Option 7',
        type: 'select',
        options: ['Option A', 'Option B', 'Option C'],
        required: false
      }
    ]
  },
  sectionB: {
    title: 'B. Components',
    description: 'Optionally add predefined components and percentages. The total does not block case creation.'
  },
  sectionC: {
    title: 'C. Component characteristics',
    description: 'Characteristics are displayed automatically for the components selected in Section B.',
    characteristics: [
      { id: 'C1', label: 'C1', unit: '-' },
      { id: 'C2', label: 'C2', unit: '-' },
      { id: 'C3', label: 'C3', unit: '-' },
      { id: 'C4', label: 'C4', unit: '-' },
      { id: 'C5', label: 'C5', unit: '-' },
      { id: 'C6', label: 'C6', unit: '-' },
      { id: 'C7', label: 'C7', unit: '-' },
      { id: 'C8', label: 'C8', unit: '-' },
      { id: 'C9', label: 'C9', unit: '-' },
      { id: 'C10', label: 'C10', unit: '-' },
      { id: 'C11', label: 'C11', unit: '-' },
      { id: 'C12', label: 'C12', unit: '-' },
      { id: 'C13', label: 'C13', unit: '-' },
      { id: 'C14', label: 'C14', unit: '-' },
      { id: 'C15', label: 'C15', unit: '-' }
    ]
  },
  sectionD: {
    title: 'D. Parameters and limits',
    description: 'Enter any available minimum, target, and maximum values. Every field is optional.',
    fields: [
      { id: 'D1', label: 'Parameter 1', unit: 'unit' },
      { id: 'D2', label: 'Parameter 2', unit: 'unit' },
      { id: 'D3', label: 'Parameter 3', unit: 'unit' },
      { id: 'D4', label: 'Parameter 4', unit: 'unit' },
      { id: 'D5', label: 'Parameter 5', unit: 'unit' },
      { id: 'D6', label: 'Parameter 6', unit: 'unit' },
      { id: 'D7', label: 'Parameter 7', unit: 'unit' },
      { id: 'D8', label: 'Parameter 8', unit: 'unit' },
      { id: 'D9', label: 'Parameter 9', unit: 'unit' },
      { id: 'D10', label: 'Parameter 10', unit: 'unit' },
      { id: 'D11', label: 'Parameter 11', unit: 'unit' }
    ]
  }
});

function getFormSchema() {
  return JSON.parse(JSON.stringify(FORM_SCHEMA));
}
