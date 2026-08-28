/**
 * Editable component database.
 *
 * Replace these examples with real components. Every component must have a
 * unique code and 15 characteristic values (C1 through C15).
 * See COMPONENT_DATABASE_EXAMPLE.md for a complete example.
 */
var COMPONENT_DATABASE = Object.freeze([
  createExampleComponent_('COMP-001', 'Component 1', 10),
  createExampleComponent_('COMP-002', 'Component 2', 20),
  createExampleComponent_('COMP-003', 'Component 3', 30),
  createExampleComponent_('COMP-004', 'Component 4', 40),
  createExampleComponent_('COMP-005', 'Component 5', 50),
  createExampleComponent_('COMP-006', 'Component 6', 60)
]);

function createExampleComponent_(code, name, seed) {
  var characteristics = {};
  for (var index = 1; index <= 15; index += 1) {
    characteristics['C' + index] = seed + index;
  }
  return {
    code: code,
    name: name,
    characteristics: characteristics
  };
}

function getComponents() {
  return JSON.parse(JSON.stringify(COMPONENT_DATABASE));
}

function getComponentMap_() {
  return COMPONENT_DATABASE.reduce(function(map, component) {
    map[component.code] = component;
    return map;
  }, {});
}
