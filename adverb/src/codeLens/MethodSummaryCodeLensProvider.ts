import { CodeLens, CodeLensProvider, Event, EventEmitter, ProviderResult, Range, TextDocument, window, workspace } from "vscode";
import { getCodeSummary } from "../api";
import ast from "../ast";
import { Commands } from "../commands";
import { Settings } from "../settings";

export class MethodSummaryCodeLensProvider implements CodeLensProvider {
    private _onDidChangeCodeLenses: EventEmitter<void> = new EventEmitter<void>();
    public readonly onDidChangeCodeLenses: Event<void> = this._onDidChangeCodeLenses.event;
    private codeLenses: CodeLens[] = [];

    constructor() {
        workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("adverb"))
                this._onDidChangeCodeLenses.fire();
        });
    };

    provideCodeLenses(document: TextDocument): ProviderResult<CodeLens[]> {
        if (Settings.areCodeLensEnabled() && !document.isDirty) {
            const ranges: Range[] = ast.getFunctionDeclarations(document);
            this.codeLenses = ranges.map(x => new CodeLens(x));
        }
        return this.codeLenses;
    };

    async resolveCodeLens(codeLens: CodeLens): Promise<CodeLens | null> {
        if (Settings.areCodeLensEnabled()) {
            const editor = window.activeTextEditor;
            if (editor?.document && !codeLens.command) {
                let content: string = "";
                for (let i = codeLens.range.start.line; i <= codeLens.range.end.line; i++) {
                    content += editor.document.lineAt(i).text + "\n";
                }
                const summary = await getCodeSummary(content);
                if (summary) {
                    codeLens.command = {
                        title: summary,
                        tooltip: "Click to fold",
                        command: Commands.Fold,
                        arguments: [codeLens.range.start.line, codeLens.range.end.line, summary]
                    };
                    return codeLens;
                }
            }
        }
        return null;
    };
}