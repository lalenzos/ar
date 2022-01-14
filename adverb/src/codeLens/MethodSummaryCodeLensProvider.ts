import { CancellationToken, CodeLens, CodeLensProvider, Event, EventEmitter, ProviderResult, Range, TextDocument, window, workspace } from "vscode";
import { getCodeSummary } from "../api";
import ast from "../ast";
import { Cache } from "../cache";
import { Commands } from "../commands";
import { Settings } from "../settings";

export class MethodSummaryCodeLensProvider implements CodeLensProvider {
    private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;

    private codeLenses: CodeLens[] = [];
    private currentlyProcessing: Range[] = [];

    constructor() {
        workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("adverb"))
                this._onDidChangeCodeLenses.fire();
        });

        workspace.onDidSaveTextDocument(async (document) => {
            Cache.cleanCodeLensCacheOfDocument(document.fileName);
            this._onDidChangeCodeLenses.fire();
        });
    };

    public provideCodeLenses(document: TextDocument): ProviderResult<CodeLens[]> {
        if (Settings.areCodeLensEnabled() && !document.isDirty) {
            const documentCache = Cache.getCodeLensCacheOfDocument(document.fileName);
            const ranges: Range[] = ast.getFunctionDeclarations(document);
            this.codeLenses = ranges
                .filter(range => !this.currentlyProcessing.some(x => x.isEqual(range)))
                .map(range => {
                    const cachedCodeLens = documentCache?.find(x => x.range === range);
                    return new CodeLens(range, cachedCodeLens?.command);
                });
            return this.codeLenses;
        }
        return [];
    };

    public resolveCodeLens(codeLens: CodeLens) {
        if (Settings.areCodeLensEnabled()) {
            const editor = window.activeTextEditor;
            if (editor?.document && !codeLens.command) {
                const cachedSummary = Cache.getCodeLensCacheOfDocumentAndCodeBlock(editor.document.fileName, codeLens.range);
                if (cachedSummary) {
                    codeLens.command = cachedSummary.command;
                    return codeLens;
                }
                else {
                    if (this.currentlyProcessing.some(x => x.isEqual(codeLens.range)))
                        return codeLens;
                    this.currentlyProcessing.push(codeLens.range);
                    let content: string = "";
                    for (let i = codeLens.range.start.line; i <= codeLens.range.end.line; i++) {
                        content += editor.document.lineAt(i).text + "\n";
                    }
                    console.log(`API summary request for line range ${codeLens.range.start.line + 1}-${codeLens.range.end.line + 1}`)
                    return getCodeSummary(content).then((summary) => {
                        if (summary) {
                            codeLens.command = {
                                title: summary,
                                tooltip: "Click to fold",
                                command: Commands.Fold,
                                arguments: [codeLens.range.start.line, codeLens.range.end.line, summary]
                            }
                            Cache.updateCodeLensCacheOfDocumentAndCodeBlock(editor.document.fileName, codeLens.range, codeLens.command);
                            this.currentlyProcessing = this.currentlyProcessing.filter(x => !x.isEqual(codeLens.range));
                        }
                        return codeLens;
                    });
                }
            }
        }
        return codeLens;
    };
}