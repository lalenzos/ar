import {
  FoldingRange,
  FoldingRangeKind,
  languages,
  Position,
  Range,
  TextDocument,
  TextEditor,
  window,
} from "vscode";
import ast from "./ast";
import configuration from "./configuration";
import { FoldingTreeViewProvider, GlobalRenamingTreeViewProvider, LocalRenamingTreeViewProvider } from "./treeViews";

export const SUPPORTED_LANGUAGES = ["javascript", "typescript"];

let renamingTimeout: NodeJS.Timer | undefined = undefined;
let foldingTimeout: NodeJS.Timer | undefined = undefined;
let globalTreeViewProvider: GlobalRenamingTreeViewProvider;
let localTreeViewProvider: LocalRenamingTreeViewProvider;
let foldingTreeViewProvider: FoldingTreeViewProvider;

export const initialize = (_globalTreeViewProvider: GlobalRenamingTreeViewProvider, _localTreeViewProvider: LocalRenamingTreeViewProvider, _foldingTreeViewProvider: FoldingTreeViewProvider) => {
  globalTreeViewProvider = _globalTreeViewProvider;
  localTreeViewProvider = _localTreeViewProvider;
  foldingTreeViewProvider = _foldingTreeViewProvider;
}

export const refreshRenamings = (
  positions: Position[] | undefined = undefined
) => {
  if (renamingTimeout) {
    clearTimeout(renamingTimeout);
    renamingTimeout = undefined;
  }
  renamingTimeout = setTimeout(() => {
    const editor = window.activeTextEditor;
    if (editor) {
      ast.refreshRenamings(editor, positions);
      localTreeViewProvider.refresh(editor?.document.uri);
    }
    globalTreeViewProvider.refresh();
  }, 100);
};

export const refreshFoldings = (
  visibleRanges: Range[] | undefined = undefined
) => {
  if (foldingTimeout) {
    clearTimeout(foldingTimeout);
    foldingTimeout = undefined;
  }
  foldingTimeout = setTimeout(async () => {
    const editor = window.activeTextEditor;
    if (editor) {
      await updateEditorFoldingRanges(editor);
      ast.refreshFoldings(editor, visibleRanges);
      foldingTreeViewProvider.refresh(editor?.document.uri);
    }
  }, 100);
};

export const updateEditorFoldingRanges = async (editor: TextEditor) => {
  const foldings = await configuration.getFoldings(editor.document.uri);
  if (foldings) {
    await languages.registerFoldingRangeProvider(SUPPORTED_LANGUAGES, {
      provideFoldingRanges(document: TextDocument): FoldingRange[] {
        const result: FoldingRange[] = [];
        Object.keys(foldings).forEach((f) => {
          const folding = foldings[f];
          result.push(
            new FoldingRange(
              folding.start,
              folding.end,
              FoldingRangeKind.Region
            )
          );
        });
        return result;
      },
    });
  }
};

export const showInputDialog = async (
  originalName: string
): Promise<string | undefined> => {
  return await window.showInputBox({
    title: `Enter a new name for '${originalName}':`,
    value: originalName,
    validateInput: (value) =>
      value === originalName ? "Please choose a new name." : undefined,
  });
};

export const showScopePick = async (): Promise<boolean | undefined> => {
  const result = await showQuickPick("Choose the scope", [
    "Local (current file)",
    "Global (whole workspace)",
  ]);
  if (result === undefined) return undefined;
  return result === "Local (current file)" ? false : true;
};

export const showQuickPick = async (
  title: string,
  items: string[]
): Promise<string | undefined> => {
  return await window.showQuickPick(items, {
    canPickMany: false,
    title: title,
  });
};
