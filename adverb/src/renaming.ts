import * as vscode from "vscode";
import { parse as babelParse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as recast from "recast";
import { Renaming } from "./models";
import workspaceState from "./workspaceState";

const hideDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor("editor.background"),
    color: new vscode.ThemeColor("editor.background"),
    letterSpacing: "-100em"
});
const renamingDecorationType = vscode.window.createTextEditorDecorationType({});

const refresh = (editor: vscode.TextEditor, currentlySelectedPositions: vscode.Position[] | undefined = undefined) => {
    const stateObjects = workspaceState.getValues(editor.document.uri);
    if (stateObjects) {
        const result: Renaming[] = [];
        const originalNames = Object.keys(stateObjects);
        const ast = parse(editor.document.getText());
        traverse(ast, {
            enter(path) {
                if (path.isIdentifier() && originalNames.includes(path.node.name)) {
                    const stateObject = stateObjects[path.node.name]!;
                    const loc = path.node.loc!;
                    const range: vscode.Range = new vscode.Range(
                        new vscode.Position(loc.start.line - 1, loc.start.column),
                        new vscode.Position(loc.end.line - 1, loc.end.column),
                    );

                    if (currentlySelectedPositions && currentlySelectedPositions.find(x => x.line === range.start.line)) {
                        //skip this "renaming"
                    } else {
                        result.push(new Renaming(stateObject.originalName, stateObject.newName, stateObject.type, range))
                    }
                }
            }
        });

        //Hide original identifiers
        editor.setDecorations(hideDecorationType, result);

        //"Rename" original identifier by adding the "new" name as annotation
        const annotations = result.map(i => createAnnotation(i.newName, i.range));
        editor.setDecorations(renamingDecorationType, annotations);
    }
};


const createAnnotation = (content: string, range: vscode.Range) => ({
    range,
    renderOptions: {
        before: {
            contentText: content,
            // backgroundColor: new vscode.ThemeColor("adverb.backgroundColor"),
            backgroundColor: vscode.workspace.getConfiguration("adverb").get("backgroundColor"),
            fontColor: vscode.workspace.getConfiguration("adverb").get("foregroundColor"),
            fontStyle: vscode.workspace.getConfiguration("adverb").get("fontStyle"),
            fontWeight: vscode.workspace.getConfiguration("adverb").get("fontWeight"),
            textDecoration: `;
                    font-size: ${vscode.workspace.getConfiguration("adverb").get("fontSize")};
                    margin: ${vscode.workspace.getConfiguration("adverb").get("margin")};
                    padding: ${vscode.workspace.getConfiguration("adverb").get("padding")};
                    border-radius: ${vscode.workspace.getConfiguration("adverb").get("borderRadius")};
                    border: ${vscode.workspace.getConfiguration("adverb").get("border")};
                    vertical-align: middle;
                `,
        },
    } as vscode.DecorationInstanceRenderOptions,
} as vscode.DecorationOptions);


const checkIfNameIsACodeSymbol = (editor: vscode.TextEditor, name: string): boolean => {
    let result = false;
    const ast = parse(editor.document.getText());
    traverse(ast, {
        enter(path) {
            if (path.isIdentifier() && path.node.name === name)
                result = true;
        }
    });
    return result;
};

const parse = (code: string) => {
    try {
        return recast.parse(code, {
            parser: {
                parse: (source: string) =>
                    babelParse(source, {
                        sourceType: "module",
                        allowImportExportEverywhere: true,
                        allowReturnOutsideFunction: true,
                        startLine: 1,

                        // Tokens are necessary for Recast to do its magic ✨
                        tokens: true,

                        plugins: [
                            "asyncGenerators",
                            "bigInt",
                            "classPrivateMethods",
                            "classPrivateProperties",
                            "classProperties",
                            "decorators-legacy",
                            "doExpressions",
                            "dynamicImport",
                            "exportDefaultFrom",
                            "exportNamespaceFrom",
                            "functionBind",
                            "functionSent",
                            "importMeta",
                            "jsx",
                            "logicalAssignment",
                            "nullishCoalescingOperator",
                            "numericSeparator",
                            "objectRestSpread",
                            "optionalCatchBinding",
                            "optionalChaining",
                            "partialApplication",
                            ["pipelineOperator", { proposal: "minimal" }],
                            "placeholders",
                            "throwExpressions",
                            "topLevelAwait",
                            "typescript"
                        ]
                    })
            },
            tabWidth: 1
        });
    } catch (error) {

    }
}

export default { checkIfNameIsACodeSymbol, refresh };