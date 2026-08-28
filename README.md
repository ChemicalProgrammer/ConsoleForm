# Case Console — Google Apps Script

Case Console is a Google Apps Script web application for creating, viewing,
editing, renaming, trashing, and restoring cases stored in a Shared Drive.

Each case contains `01 Input Data` and folders `02` through `04`. A Google Sheets
template is copied directly into `01 Input Data`, and the copied spreadsheet
remains the source of truth for Input Data.

## Main workflow

1. The web app opens on the **Cases Dashboard**.
2. **New case** opens the Input Data form.
3. Only **Case name** is required. Sections A, B, and D may be empty.
4. Saving a new case creates:

   ```text
   Case name/
   ├── 01 Input Data/
   │   └── Case name - Form
   ├── 02/
   ├── 03/
   └── 04/
   ```

5. Opening a case reads current values from its Google Sheets file.
6. **Save changes** writes only the cells and table ranges configured in
   `TemplateMapping.gs`.
7. Changing the case name renames the case folder, copied spreadsheet, mapped
   title cell, and registry row.
8. **Move to trash** requires typing the exact case name. The operation is
   recoverable from the dashboard's **Trash** filter.
9. **Output Data** is an empty workspace reserved for future report generators.

## Shared application settings and registry

Settings are stored once with `ScriptProperties`; they are not repeated per
user.

- **Destination folder:** parent folder where all case folders are created.
- **Google Sheets template:** master spreadsheet copied for every case.
The Case Registry no longer requires an additional Google Sheets file. Each
record is stored as an independent JSON value in Apps Script `ScriptProperties`.
The registry contains IDs, status, dates, and available user identities; form
answers remain in each case spreadsheet.

When upgrading from version 2, the first dashboard load imports the previous
`Case Registry` spreadsheet automatically. The old spreadsheet is retained as a
backup and is no longer written by the console.

## Other components

Section B includes **Other** in the component selector. Selecting it unlocks an
editable code and name. Section C then displays editable fields for all 15
characteristics on that row. Predefined components remain read-only.

## Existing cases

Use **Import existing cases** once after upgrading from the form-only version.
The migration scans only the configured destination folder, finds a Google
Sheets file inside `01 Input Data` (or the legacy `01` folder), assigns a stable
case ID, and adds a registry record. It does not overwrite mapped form cells.

## Direct Google Sheets edits

The console reads values from Google Sheets every time a case is opened or
**Reload from Sheet** is selected. Therefore, direct spreadsheet edits appear
in the web app after a reload.

If a user has unsaved browser changes, the console asks before reloading or
leaving the case. A registry timestamp also prevents one web-app user from
silently overwriting a newer save made by another web-app user.

## Main files

| File | Responsibility |
| --- | --- |
| `Config.gs` | Application names, folder rules, registry keys, and schema version. |
| `SettingsService.gs` | Shared Script Properties and setup validation. |
| `CaseRegistry.gs` | Script Properties registry, legacy migration, reads, writes, and serialization. |
| `CaseService.gs` | Create, open, update, rename, trash, restore, and migration operations. |
| `DriveService.gs` | Folder structure, parent verification, Shared Drive trash/restore, and discovery. |
| `FieldDefinitions.gs` | Section A, C, and D definitions. |
| `Components.gs` | Predefined component database. |
| `TemplateMapping.gs` | Bidirectional mapping between form values and specific cells. |
| `TemplateService.gs` | Copies, reads, clears, and writes mapped spreadsheet data. |
| `Validation.gs` | Server-side normalization; only the case name is required. |
| `WebApp.gs` | Web entry point and bootstrap data. |
| `Index.html` | Dashboard, case workspace, dialogs, Input Data, and Output Data. |
| `Scripts.html` | Client navigation, rendering, loading, saving, and warnings. |
| `Styles.html` | Responsive visual design. |
| `Tests.gs` | Non-destructive structural self-test. |

## Google Sheets mapping

Edit `TemplateMapping.gs` to match the real template. Example:

```javascript
general: {
  caseName: { sheet: 'Form', cell: 'B2' },
  createdDate: { sheet: 'Form', cell: 'B3' }
}
```

The same mapping is used for both reading and writing. Dynamic tables reserve
`maxRows`; when saving an edited case, the reserved table range is cleared
before the current component rows are written. This prevents removed components
from remaining in the spreadsheet.

See `GOOGLE_SHEETS_TEMPLATE.md` and `COMPONENT_DATABASE_EXAMPLE.md`.

## Install and deploy

1. Copy every `.gs`, `.html`, `.md`, and `appsscript.json` file into the Apps
   Script project.
2. Confirm that the manifest enables **Drive API v3** as an advanced service.
3. Edit `FieldDefinitions.gs`, `Components.gs`, and `TemplateMapping.gs`.
4. Run `runProjectSelfTest` and confirm `ok: true`.
5. Select **Deploy → New deployment → Web app**.
6. Select **Execute as: User accessing the web app** so Shared Drive permissions
   are evaluated for the active user.
7. Restrict access to the appropriate organization or group.
8. Open the web app, select **Settings**, and save the shared configuration.
9. If upgrading, run **Import existing cases**.

After code changes, select **Deploy → Manage deployments**, edit the deployment,
choose **New version**, and deploy again.

## Recovery and safety

- Browser requests identify a case by its generated `caseId`; the server resolves
  Drive IDs from the registry.
- Before trashing or renaming, the server verifies that the case folder belongs
  to the configured destination folder.
- Create, update, rename, trash, restore, migration, and settings changes use a
  script lock to prevent concurrent registry collisions.
- If case creation fails after a folder is created, the incomplete folder is
  moved to trash.
- Shared Drive trash and restore operations use the Advanced Drive service with
  `supportsAllDrives`.
