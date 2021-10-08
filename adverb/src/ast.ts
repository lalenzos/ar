import * as vscode from "vscode";
import { parse as babelParse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as recast from "recast";
import { getRenamingTypes, Renaming } from "./models";
import configuration from "./configuration";
import { SUPPORTED_LANGUAGES } from "./extension";

const hideDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor("editor.background"),
    color: new vscode.ThemeColor("editor.background"),
    letterSpacing: "-100em"
});
const renamingDecorationType = vscode.window.createTextEditorDecorationType({});

const refresh = async (editor: vscode.TextEditor | undefined, currentlySelectedPositions: vscode.Position[] | undefined = undefined) => {
    if (editor) {
        const result: Renaming[] = [];
        if (SUPPORTED_LANGUAGES.includes(editor.document.languageId)) {
            const renamingTypes = getRenamingTypes();
            const fileConfig = await configuration.getSourceCodeFileConfiguration(editor.document.uri)
            if (fileConfig) {
                const renamings = fileConfig.singleRenamingConfigurations;
                if (fileConfig.fileRenamingTypeId || renamings) {
                    const originalNames: string[] = renamings ? Object.keys(renamings) : [];
                    const ast = parse(editor.document.getText());
                    if (!ast)
                        return;
                    traverse(ast, {
                        enter(path) {
                            if (path.isIdentifier()) {
                                if (fileConfig.fileRenamingTypeId || originalNames.includes(path.node.name)) {
                                    const loc = path.node.loc!;
                                    const range: vscode.Range = new vscode.Range(
                                        new vscode.Position(loc.start.line - 1, loc.start.column),
                                        new vscode.Position(loc.end.line - 1, loc.end.column),
                                    );

                                    if (currentlySelectedPositions && currentlySelectedPositions.find(x => x.line === range.start.line)) {
                                        //skip this "renaming"
                                    } else {
                                        if (originalNames.includes(path.node.name)) {
                                            const renaming = renamings![path.node.name]!;
                                            const renamingType = renamingTypes.find(x => x.id === renaming.renamingTypeId)!;
                                            result.push(new Renaming(path.node.name, renaming.newName, renamingType, range));
                                        } else {
                                            const renamingType = renamingTypes.find(x => x.id === fileConfig.fileRenamingTypeId)
                                            if (renamingType?.getNewNameFunction) {
                                                const newName = renamingType.getNewNameFunction(path.node.name);
                                                if (newName)
                                                    result.push(new Renaming(path.node.name, newName, renamingType, range));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
            }
        }

        //Hide original identifiers
        editor.setDecorations(hideDecorationType, result);

        //"Rename" original identifier by adding the "new" name as annotation
        const annotations = result.map(i => createAnnotation(i.newName, i.range));
        editor.setDecorations(renamingDecorationType, annotations);
    }
};

const createAnnotation = (content: string, range: vscode.Range) => {
    const backgroundColor: string | undefined = vscode.workspace.getConfiguration("adverb").get("backgroundColor");
    const fontColor: string | undefined = vscode.workspace.getConfiguration("adverb").get("fontColor");
    return {
        range,
        renderOptions: {
            before: {
                contentText: content,
                backgroundColor: backgroundColor?.startsWith("#") ? new vscode.ThemeColor(backgroundColor) : backgroundColor,
                fontColor: fontColor?.startsWith("#") ? new vscode.ThemeColor(fontColor) : fontColor,
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
    } as vscode.DecorationOptions;
};

const checkIfNameIsACodeSymbol = (editor: vscode.TextEditor, name: string): boolean => {
    let result = false;
    const ast = parse(editor.document.getText());
    if (!ast)
        return result;
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
        // console.log(error);
    }
}

export default { checkIfNameIsACodeSymbol, refresh };