/** Web application entry point. */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP_CONFIG.appName)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Allows HTML to be split into reusable files. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** Initial data required to build the dashboard and case workspace. */
function getBootstrapData() {
  var settings = getAppSettings();
  var settingsComplete = areSettingsComplete_();
  var cases = [];
  var setupError = '';

  if (settingsComplete) {
    try {
      cases = listCases({ includeTrashed: true });
    } catch (error) {
      setupError = error.message || String(error);
    }
  }

  return {
    appName: APP_CONFIG.appName,
    schema: getFormSchema(),
    components: getComponents(),
    maxComponentRows: Math.min(
      SHEET_TEMPLATE_MAPPING.sectionB.maxRows,
      SHEET_TEMPLATE_MAPPING.sectionC.maxRows
    ),
    settings: settings,
    settingsComplete: settingsComplete,
    setupError: setupError,
    cases: cases,
    currentUser: getCurrentUserEmail_()
  };
}
