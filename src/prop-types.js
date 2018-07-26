const d = require('dts-dom');

const type = Object.assign(d.create.namedTypeReference, d.type);

const {Optional, None} = d.DeclarationFlags;

const propType = inputType => {
  const applyPropType = required => function __propType__(key) {
    return key
      ? d.create.property(key, inputType, required ? None : Optional)
      : inputType 
  }

  return Object.assign(applyPropType(false), {isRequired: applyPropType(true)})
}

function createShapePropType(shape) {
  // shape should be an object with all value types being prop-types
  const props = Object.keys(shape).map(key => shape[key](key));

  return propType(d.create.objectType(props));
}

function createExactShapePropType(shape) {
  // shape should be an object with all value types being prop-types
  const props = Object.keys(shape).map(key => shape[key].isRequired(key));

  return propType(d.create.objectType(props));
}

function createOneOfTypePropType(types) {
  // oneOf should be an array with all value types being prop-types
  const props = types.map(t => {
    if (t.name !== '__propType__') {
      return type.any;
    }

    return t();
  });

  return propType(d.create.union(props));
}

const PropTypes = {
  array: propType(type.array('any')),
  bool: propType(type.boolean),
  func: propType(d.create.functionType([
    d.create.parameter('args', type.array(type.any), d.ParameterFlags.Rest)
  ], type.any)),
  number: propType(type.number),
  object: propType(type.object),
  string: propType(type.string),
  symbol: propType(type.any),

  any: propType(type.any),
  arrayOf: t => propType(type.array(t())),
  element: propType(type('React.ReactElement<any>')),
  instanceOf: obj => propType(d.create.namedTypeReference(obj.name)),
  node: propType(type('React.ReactNode')),
  objectOf: t => propType(d.create.objectType([
    d.create.indexSignature('key', type.string, t())
  ])),
  // TODO: only working for string types
  oneOf: types => propType(
    d.create.union(types.map(type.stringLiteral))
  ),
  oneOfType: createOneOfTypePropType,
  shape: createShapePropType,
  exact: createExactShapePropType,
};

const reactIsDeprecated = {
  deprecate: () => propType(type.void)
}

// Hack because some components do `import {PropTypes} from 'prop-types'
module.exports = Object.assign(PropTypes, {PropTypes}, reactIsDeprecated);
