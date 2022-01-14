import {
  ExtensionContext,
  languages,
  Position,
  Range,
  TextEditorVisibleRangesChangeEvent,
  window,
  workspace,
} from "vscode";
import ast from "./ast";
import { MethodSummaryCodeLensProvider } from "./codeLens";
import { ModifiedFileFileDecorationProvider } from "./fileDecorations";
import { Settings } from "./settings";
import { clearFoldings, getPositionsFromRange, refreshFoldings, refreshRenamings, SUPPORTED_LANGUAGES } from "./utils";

export const registerEvents = (context: ExtensionContext) => {
  window.onDidChangeActiveTextEditor(() => {
    refreshRenamings();
  }, null, context.subscriptions);

  window.onDidChangeTextEditorSelection((event) => {
    const selectedPositions = event.selections.length > 0 ? getPositionsFromRange(event.selections[0].start, event.selections[0].end) : [];
    ast.refreshRenamings(event.textEditor, selectedPositions);
    ast.highlightSymbolDefinitions(event.textEditor, selectedPositions);
  }, null, context.subscriptions);

  window.onDidChangeTextEditorVisibleRanges((event: TextEditorVisibleRangesChangeEvent) => {
    refreshFoldings(event.textEditor, event.visibleRanges);
  });

  workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("adverb")) {
      Settings.readSettings();
      refreshRenamings();
      const editor = window.activeTextEditor;
      if (editor)
        clearFoldings(editor);
    }
  }, null, context.subscriptions);

  workspace.onDidChangeTextDocument((event) => {
    const editor = window.activeTextEditor;
    if (!editor || event.document !== editor.document) return;
    if (event.contentChanges.length === 1)
      ast.refreshRenamings(editor, [event.contentChanges[0].range.start]);
    else
      ast.refreshRenamings(editor);
    clearFoldings(editor);
  }, null, context.subscriptions);

  languages.registerCodeLensProvider(SUPPORTED_LANGUAGES, new MethodSummaryCodeLensProvider());
  window.registerFileDecorationProvider( new ModifiedFileFileDecorationProvider());
};