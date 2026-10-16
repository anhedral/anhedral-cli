import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Validate emitted modules before workerd starts, including lazy literal imports.
export function verifyServerModuleGraph(directory) {
  let modules = 0;
  let imports = 0;
  function walk(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.m?js$/.test(entry.name)) {
        modules++;
        const source = ts.createSourceFile(
          file,
          readFileSync(file, 'utf8'),
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.JS,
        );
        function visit(node) {
          const specifier =
            ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
              ? node.moduleSpecifier
              : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
                ? node.arguments[0]
                : undefined;
          if (specifier && ts.isStringLiteralLike(specifier) && specifier.text.startsWith('.')) {
            imports++;
            assert.ok(
              existsSync(path.resolve(path.dirname(file), specifier.text)),
              `Missing built module ${specifier.text} imported by ${path.relative(directory, file)}`,
            );
          }
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
  }
  walk(directory);
  assert.ok(modules, 'No built server modules found');
  return { modules, imports };
}
