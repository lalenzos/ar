import {
  ExtensionContext,
  FileDecoration,
  Position,
  Range,
  TextEditorVisibleRangesChangeEvent,
  window,
  workspace,
} from "vscode";
import ast from "./ast";
import configuration from "./configuration";
import { Settings } from "./settings";
import { refreshRenamings, refreshFoldings } from "./utils";

export const registerEvents = (context: ExtensionContext) => {
  window.onDidChangeActiveTextEditor(() => {
    refreshRenamings();
    refreshFoldings();
  }, null, context.subscriptions);

  window.onDidChangeTextEditorSelection((event) => {
    const selectedPositions = event.selections.length > 0 ? getPositionRanges(event.selections[0].start, event.selections[0].end) : [];
    refreshRenamings(selectedPositions);
    refreshFoldings();
    ast.highlightSymbolDefinitions(event.textEditor, selectedPositions);
  }, null, context.subscriptions);

  window.onDidChangeTextEditorVisibleRanges((event: TextEditorVisibleRangesChangeEvent) => {
    refreshFoldings(event.visibleRanges as Range[]);
  });

  workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("adverb")) {
      Settings.readSettings();
      refreshRenamings();
      refreshFoldings();
    }
  }, null, context.subscriptions);

  workspace.onDidChangeTextDocument((event) => {
    const editor = window.activeTextEditor;
    if (!editor || event.document !== editor.document) return;
    if (event.contentChanges.length === 1)
      refreshRenamings([event.contentChanges[0].range.start]);
    else
      refreshRenamings();
    refreshFoldings();
  }, null, context.subscriptions);

  window.registerFileDecorationProvider({
    async provideFileDecoration(uri) {
      if (Settings.areFileDecorationsEnabled()) {
        const config = await configuration.getMergedConfigurationForCurrentFile(uri);
        if (config?.fileRenaming ||
          (config?.foldings && Object.values(config?.foldings).length > 0) ||
          (config?.renamings && Object.values(config?.renamings).length > 0)
        )
          return new FileDecoration("🚧");
      }
      return new FileDecoration();
    }
  })
};

const getPositionRanges = (start: Position, stop: Position): Position[] => {
  const result: Position[] = [start];
  let b: Position = start;
  while (b.line < stop.line - 1) {
    b = new Position(b.line + 1, 0);
    result.push(b);
  }
  return result;
};