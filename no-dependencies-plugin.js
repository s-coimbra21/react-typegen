const t = require('babel-types');

module.exports = () => ({
  visitor: {
    ImportDeclaration(path) {
      if (
        path.node.source.value.endsWith('.css')
      ) {
        path.replaceWithMultiple(
          path.node.specifiers.map(spec =>
            t.variableDeclaration("const", [
              t.variableDeclarator(
                t.identifier(spec.local.name),
                t.objectExpression([])
              )
            ])
          )
        );
      }
    },
    CallExpression(path) {
      if (path.node.callee.name === 'pure') {
        path.replaceWith(
          t.identifier(path.node.arguments[0].name)
        )
      }
    }
  }
})

