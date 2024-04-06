import path from 'path';
import * as tm from 'ts-morph';

const rootDir = path.resolve(__dirname, '..');
const tsConfigFilePath = path.join(rootDir, 'tsconfig.json');
const resourceFilePath = path.join(rootDir, 'src/resources/**/*.ts');

async function createParamHelpers() {
  const project = new tm.Project({ tsConfigFilePath });
  project.addSourceFilesAtPaths(resourceFilePath);

  const creatorFnNames = project.getSourceFiles().flatMap(addHelpersToInterfaces);

  const exportFile = project.getSourceFile('src/resources/index.ts');
  if (!exportFile) throw new Error('Failed to retreive resource export file');

  project.getSourceFiles().forEach((file) => addCreatorsToImports(file, exportFile));

  // create a singleton object so this is easier to attach to our client
  exportFile.addVariableStatement({
    isExported: true,
    declarationKind: tm.VariableDeclarationKind.Const,
    declarations: [
      {
        name: 'params',
        initializer: `{${creatorFnNames.join(',\n')}}`,
      },
    ],
  });

  // probably should just let prettier be dealing with this
  exportFile.formatText({ indentSize: 2 });

  await project.save();
}

function addHelpersToInterfaces(file: tm.SourceFile): string[] {
  // let's skip the beta folder for now
  if (file.getFilePath().includes('beta')) {
    return [];
  }

  return (
    file
      .getInterfaces()
      // this is extremely naive
      .filter((interfaceDeclaration) => interfaceDeclaration.getName().includes('Params'))
      .map((interfaceDeclaration) => {
        const name = interfaceDeclaration.getName();
        // side effect in a map not my favorite but ts-morph API makes it awkward to work around
        const fn = file.addFunction({
          // keep leaning into our suffix Hungarian notation
          name: `${name}Creator`,
          isExported: true,
          parameters: [{ name: 'params', type: name }],
          returnType: name,
          statements: ['return params;'],
        });
        fn.formatText({ indentSize: 2 });
        // return the names so we can use it to generate import / exports later
        return fn.getName();
      })
      // this will suck less with https://github.com/microsoft/TypeScript/pull/57465
      .filter(isString)
  );
}

function addCreatorsToImports(file: tm.SourceFile, exportFile: tm.SourceFile) {
  const creatorFns = file.getFunctions().filter((fn) => fn?.getName()?.includes('Creator'));
  const importPath = path.relative('src/resources', file.getFilePath());
  if (creatorFns.length) {
    exportFile.addImportDeclaration({
      moduleSpecifier: `./${importPath.replace('.ts', '')}`,
      namedImports: creatorFns.map((fn) => fn.getName() as string),
    });
  }
}

function isString(x: any): x is string {
  return typeof x === 'string';
}

createParamHelpers();
