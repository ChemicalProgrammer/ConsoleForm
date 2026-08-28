# Component database example

The application uses two related definitions:

- `FieldDefinitions.gs` defines what C1–C15 mean and which unit is displayed in
  each shared table header.
- `Components.gs` stores one record per component and its actual values.

## 1. Define the shared headers

Illustrative example for `FieldDefinitions.gs`:

```javascript
characteristics: [
  { id: 'C1', label: 'Function', unit: '-' },
  { id: 'C2', label: 'Chemical family', unit: '-' },
  { id: 'C3', label: 'Physical form', unit: '-' },
  { id: 'C4', label: 'Appearance', unit: '-' },
  { id: 'C5', label: 'Active matter', unit: '%' },
  { id: 'C6', label: 'pH', unit: '-' },
  { id: 'C7', label: 'Density', unit: 'g/mL' },
  { id: 'C8', label: 'Viscosity', unit: 'cP' },
  { id: 'C9', label: 'Solubility', unit: '-' },
  { id: 'C10', label: 'Minimum temperature', unit: '°C' },
  { id: 'C11', label: 'Maximum temperature', unit: '°C' },
  { id: 'C12', label: 'Packaging', unit: '-' },
  { id: 'C13', label: 'Supplier', unit: '-' },
  { id: 'C14', label: 'Status', unit: '-' },
  { id: 'C15', label: 'Notes', unit: '-' }
]
```

Replace these illustrative labels with the 15 real characteristics.

## 2. Enter component records

Illustrative example for `Components.gs`:

```javascript
var COMPONENT_DATABASE = Object.freeze([
  {
    code: 'RM-0001',
    name: 'Purified Water',
    characteristics: {
      C1: 'Carrier / intermediate',
      C2: 'Water',
      C3: 'Liquid',
      C4: 'Clear and colorless',
      C5: 0,
      C6: 7.0,
      C7: 1.0,
      C8: 1,
      C9: 'Completely soluble',
      C10: 5,
      C11: 35,
      C12: 'Bulk',
      C13: 'Approved supplier A',
      C14: 'Active',
      C15: ''
    }
  },
  {
    code: 'RM-0002',
    name: 'Anionic Surfactant 26%',
    characteristics: {
      C1: 'Anionic surfactant',
      C2: 'Ether sulfate',
      C3: 'Viscous liquid',
      C4: 'Clear to pale yellow',
      C5: 26,
      C6: 7.5,
      C7: 1.05,
      C8: 850,
      C9: 'Water dispersible',
      C10: 15,
      C11: 40,
      C12: 'Bulk',
      C13: 'Approved supplier B',
      C14: 'Active',
      C15: 'Protect from freezing'
    }
  }
]);
```

## Database rules

- Every `code` must be unique.
- Every record must contain keys C1 through C15.
- Store numbers without quotes: `26`, `7.5`, `850`.
- Store text in quotes: `'Liquid'`, `'Active'`.
- Use `''` for a non-applicable value; the interface displays it as a dash.
- Do not append units to values. Define units once in `FieldDefinitions.gs`.
- Property order inside `characteristics` does not control table order;
  `FieldDefinitions.gs` controls it.
