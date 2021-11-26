import { commands, DecorationInstanceRenderOptions, DecorationOptions, Location, Position, Range, TextEditor, ThemeColor, Uri, window, workspace } from "vscode";
import { parse as babelParse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as recast from "recast";
import configuration from "./configuration";
import { Folding, getRenamingTypes, Renaming } from "./models";
import { SUPPORTED_LANGUAGES } from "./utils";
import { Identifier } from "@babel/types";
import { Settings } from "./settings";

const renamingHideDecorationType = window.createTextEditorDecorationType({
    backgroundColor: new ThemeColor("editor.background"),
    color: new ThemeColor("editor.background"),
    letterSpacing: "-100em"
});
const foldingHideDecorationType = window.createTextEditorDecorationType({
    backgroundColor: new ThemeColor("editor.background"),
    color: new ThemeColor("editor.background"),
    letterSpacing: "-100em"
});
const renamingDecorationType = window.createTextEditorDecorationType({});
const foldingDecorationType = window.createTextEditorDecorationType({});
const highlightVisibleDefinitionsDecorationType = window.createTextEditorDecorationType({
    backgroundColor: new ThemeColor("editor.wordHighlightBackground"),
    borderColor: new ThemeColor("editor.wordHighlightBorder"),
});
const highlightNotVisibleDefinitionsDecorationType = window.createTextEditorDecorationType({
    backgroundColor: new ThemeColor("editor.wordHighlightBackground"),
    borderColor: new ThemeColor("editor.wordHighlightBorder")
});

const refreshRenamings = async (editor: TextEditor | undefined, currentlySelectedPositions: Position[] | undefined = undefined) => {
    if (editor) {
        const result: Renaming[] = [];
        if (SUPPORTED_LANGUAGES.includes(editor.document.languageId)) {
            const renamingTypes = getRenamingTypes();
            const fileConfig = await configuration.getMergedConfigurationForCurrentFile(editor.document.uri)
            if (fileConfig) {
                const renamings = fileConfig.renamings;
                if (fileConfig.fileRenaming || renamings) {
                    const originalNames: string[] = renamings ? Object.keys(renamings) : [];
                    const ast = parse(editor.document.getText());
                    if (!ast)
                        return;
                    traverse(ast, {
                        enter(path) {
                            if (path.isIdentifier()) {
                                if (fileConfig.fileRenaming || originalNames.includes(path.node.name)) {
                                    const loc = path.node.loc!;
                                    const range: Range = new Range(
                                        new Position(loc.start.line - 1, loc.start.column),
                                        new Position(loc.end.line - 1, loc.end.column)
                                    );

                                    if (currentlySelectedPositions && currentlySelectedPositions.find(x => x.line === range.start.line)) {
                                        //skip this "renaming"
                                    } else {
                                        if (originalNames.includes(path.node.name)) {
                                            const renaming = renamings![path.node.name]!;
                                            const renamingType = renamingTypes.find(x => x.id === renaming.renamingTypeId)!;
                                            result.push(new Renaming(path.node.name, renaming.newName, renamingType, range));
                                        } else {
                                            const renamingType = renamingTypes.find(x => x.id === fileConfig.fileRenaming)
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
        editor.setDecorations(renamingHideDecorationType, result);

        //"Rename" original identifier by adding the "new" name as annotation
        const annotations = result.map(i => createAnnotation(i.newName, i.range));
        editor.setDecorations(renamingDecorationType, annotations);
    }
};

const refreshFoldings = async (editor: TextEditor | undefined, visibleRanges: Range[] | undefined = undefined) => {
    if (editor) {
        const result: Folding[] = [];
        if (SUPPORTED_LANGUAGES.includes(editor.document.languageId)) {
            const foldings = await configuration.getFoldings(editor.document.uri);
            if (foldings) {
                const visibleRows = getVisibleRows(editor, visibleRanges);
                Object.values(foldings).forEach(f => {
                    const range = editor.document.lineAt(f.start).range;
                    if (!visibleRows.has(f.start + 1))
                        result.push(new Folding(range, `🚩 ${f.message} [${f.start + 1}-${f.end + 1}]`));
                });
            }
        }

        //Hide start line of folding section
        editor.setDecorations(foldingHideDecorationType, result);

        //Show summary of folding
        const annotations = result.map(i => createAnnotation(i.message, i.range));
        editor.setDecorations(foldingDecorationType, annotations);
    }
};

const highlightSymbolDefinitions = async (editor: TextEditor | undefined, currentlySelectedPositions: Position[]) => {
    if (editor && SUPPORTED_LANGUAGES.includes(editor.document.languageId)) {
        const ranges: [Range, Range][] = [];
        for (let position of currentlySelectedPositions) {
            const ast = parse(editor.document.getText());
            if (!ast)
                return;
            const nodes: Identifier[] = [];
            traverse(ast, {
                enter(path) {
                    if (path.isIdentifier() && path.node.loc && path.node.loc.start.line - 1 === position.line)
                        nodes.push(path.node);
                }
            });
            for (let node of nodes) {
                if (node.loc) {
                    const definitions = await commands.executeCommand<Location[]>(
                        "vscode.executeDefinitionProvider",
                        editor.document.uri,
                        new Position(node.loc.start.line - 1, node.loc.start.column)
                    );
                    if (definitions) {
                        for (let definition of definitions) {
                            const uri = (definition as any).targetUri as Uri;
                            const range = (definition as any).targetSelectionRange as Range;
                            if (!uri || !range?.start)
                                continue;
                            if (uri.path === editor.document.uri.path)
                                if (range.start.line !== position.line)
                                    ranges.push([
                                        new Range(
                                            new Position(node.loc.start.line - 1, node.loc.start.column),
                                            new Position(node.loc.end.line - 1, node.loc.end.column)
                                        ),
                                        range
                                    ]);
                        }
                    }
                }
            }
        };
        const visibleRows = getVisibleRows(editor, editor.visibleRanges);
        const visibleRanges: Range[] = [];
        const notVisibleRanges: DecorationOptions[] = [];
        for (let range of ranges) {
            if (visibleRows.has(range[1].start.line))
                visibleRanges.push(range[1]);
            else
                notVisibleRanges.push(createAnnotation(` [Definition at line ${range[1].start.line + 1}]`, range[0], "after"));
        }
        editor.setDecorations(highlightVisibleDefinitionsDecorationType, visibleRanges);
        editor.setDecorations(highlightNotVisibleDefinitionsDecorationType, notVisibleRanges);
    }
}

const getSymbolPosition = (editor: TextEditor | undefined, name: string): Position | undefined => {
    let result: Position | undefined = undefined;
    if (editor) {
        if (SUPPORTED_LANGUAGES.includes(editor.document.languageId)) {
            const ast = parse(editor.document.getText());
            if (!ast)
                return result;
            traverse(ast, {
                enter(path) {
                    if (path.isIdentifier() && path.node.name === name) {
                        result = new Position(path.node.loc!.start.line - 1, path.node.loc!.start.column);
                        path.stop();
                    }
                }
            });
        }
    }
    return result;
};

const createAnnotation = (content: string, range: Range, position: "before" | "after" = "before") => {
    return {
        range,
        renderOptions: {
            [position]: {
                contentText: content,
                backgroundColor: Settings.getBackgroundColor(),
                fontColor: Settings.getFontColor(),
                fontStyle: Settings.getFontStyle(),
                fontWeight: Settings.getFontWeight(),
                textDecoration: `;
                    font-size: ${Settings.getFontSize()};
                    margin: ${Settings.getMargin()};
                    padding: ${Settings.getPadding()};
                    border-radius: ${Settings.getBorderRadius()};
                    border: ${Settings.getBorder()};
                    vertical-align: middle;
                `,
            },
        } as DecorationInstanceRenderOptions,
    } as DecorationOptions;
};

const checkIfNameIsACodeSymbol = (editor: TextEditor, name: string): boolean => {
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

const getVisibleRows = (editor: TextEditor, visibleRanges: Range[] | undefined = undefined): Set<number> => {
    const visibleRows: Set<number> = new Set<number>();
    if (!visibleRanges)
        visibleRanges = editor.visibleRanges;
    visibleRanges.forEach(r => {
        let start = r.start.line;
        while (start <= r.end.line) {
            visibleRows.add(start);
            start += 1;
        }
    });
    return visibleRows;
}

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

export default { checkIfNameIsACodeSymbol, refreshFoldings, refreshRenamings, highlightSymbolDefinitions, getSymbolPosition };