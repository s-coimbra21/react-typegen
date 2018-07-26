require('jsdom-global')()

const mock = require('mock-require');
const cssHook = require('css-modules-require-hook');
const PropTypes = require('./prop-types');

const react = require('react');

/** Mock all css */
cssHook({
  extensions: ['.css', '.less', '.sass', '.scss', '.styl'],
  preprocessCss: () => ''
});

/** Replace references to PropTypes globally */
Object.assign(react, { PropTypes });
mock('react', react);
mock('prop-types', PropTypes);
mock('react-is-deprecated', PropTypes);

const d = require('dts-dom');

const Export = d.DeclarationFlags.Export;

function isFunction(functionToCheck) {
  return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

const componentTypes = {};

function isElement(fn) {
  try {
    return react.isValidElement(fn());
  } catch (e) {
    return false;
  }
}

function getElementType(elem) {
  try {
    const rendered = elem({});
    if (typeof rendered.type === 'string') {
      return d.create.namedTypeReference(`React.StatelessComponent<JSX.IntrinsicElements["${rendered.type}"]>`);
    } else if (isFunction(rendered.type) && componentTypes[rendered.type.name]) {
      return d.create.namedTypeReference(`React.StatelessComponent<${componentTypes[rendered.type.name]}>`)
    }
  } catch (e) {}

  return d.create.namedTypeReference('React.StatelessComponent<any>');
}

function visit(obj) {
  const members = [];

  Object.keys(obj).forEach(key => {
    const value = obj[key];

    if (!value) return;

    if (value && typeof value === 'object' && value.constructor === Object) {
      const namespace = d.create.namespace(key)
      namespace.flags = Export;
      namespace.members = visit(value);
      if (members.length > 0) {
        members.push(namespace);
      } else {
        members.push(d.create.const(key, d.type.object, Export));
      }
    } else if (isFunction(value)) {
      if (value.propTypes) {
        members.push(...visitComponent(key, value));
      } else if (isElement(value)) {
        members.push(d.create.const(
          key,
          getElementType(value),
          Export
        ))
      } else {
        members.push(d.create.function(
          value.name,
          [d.create.parameter('args', d.type.array(d.type.any), d.ParameterFlags.Rest)],
          d.type.any,
          Export
        ))
      }
    }
  })

  return members;
}

function visitComponent(name, Component) {
  const propsInterfaceName = `${name}Props`;
  const propTypes = d.create.interface(propsInterfaceName, Export);
  if (!Component.propTypes) {
    propTypes.members.push(d.create.indexSignature('key', d.type.string, d.create.namedTypeReference('never')));
  } else {
    propTypes.members = Object.keys(Component.propTypes).map(key => {
      const prop = Component.propTypes[key];

      if (prop.name !== '__propType__') return d.create.property(key, d.type.any);

      return prop(key);
    });
  }
  const type = d.create.namedTypeReference(`React.ComponentType<${propsInterfaceName}>`);
  componentTypes[name] = propTypes.name;
  return [propTypes, d.create.const(name, type, Export)];
}

module.exports = ({input, output, namespace}) => {
  const m = require(input);
  let declarations = [
    d.emit(d.create.importAll('React', 'react')),
    ...visit(m).map(member => d.emit(member)).join('')
  ].join('');

  if (namespace) {
    declarations = `${declarations}
export as namespace ${namespace};
`;
  }

  console.log(`[~] writing declarations to ${output}`);

  require('fs').writeFileSync(output, declarations, 'utf8');
}