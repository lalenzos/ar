import {
  DecorationInstanceRenderOptions,
  DecorationOptions,
  Disposable,
  FoldingRange,
  FoldingRangeKind,
  FoldingRangeProvider,
  languages,
  Position,
  Range,
  TextDocument,
  TextEditor,
  ThemeColor,
  window,
} from "vscode";
import ast from "./ast";
import { Cache } from "./cache";
import { Settings } from "./settings";
import { GlobalRenamingTreeViewProvider, LocalRenamingTreeViewProvider } from "./treeViews";

export const SUPPORTED_LANGUAGES = ["javascript", "typescript"];

let renamingTimeout: NodeJS.Timer | undefined = undefined;
let globalTreeViewProvider: GlobalRenamingTreeViewProvider;
let localTreeViewProvider: LocalRenamingTreeViewProvider;

let foldingProvider: Disposable | undefined;
const foldingHideDecorationType = window.createTextEditorDecorationType({
  backgroundColor: new ThemeColor("editor.background"),
  color: new ThemeColor("editor.background"),
  letterSpacing: "-100em"
});
const foldingDecorationType = window.createTextEditorDecorationType({});

export const initializeTreeViews = (_globalTreeViewProvider: GlobalRenamingTreeViewProvider, _localTreeViewProvider: LocalRenamingTreeViewProvider) => {
  globalTreeViewProvider = _globalTreeViewProvider;
  localTreeViewProvider = _localTreeViewProvider;
}

export const refreshRenamings = (positions: Position[] | undefined = undefined) => {
  if (!Settings.isLocalRenamingEnabled() && !Settings.isGlobalRenamingEnabled())
    return;
  if (renamingTimeout) {
    clearTimeout(renamingTimeout);
    renamingTimeout = undefined;
  }
  renamingTimeout = setTimeout(() => {
    const editor = window.activeTextEditor;
    if (editor) {
      console.log("Updating renamings");
      ast.refreshRenamings(editor, positions);
      if (Settings.isLocalRenamingEnabled() && Settings.areTreeViewsEnabled())
        localTreeViewProvider.refresh(editor?.document.uri);
    }
    if (Settings.isGlobalRenamingEnabled())
      globalTreeViewProvider.refresh();
  }, 100);
};

export const addFolding = async (editor: TextEditor, start: number, end: number, summary: string) => {
  summary = `🚩 ${summary} [${start + 1}-${end + 1}]`;
  Cache.updateFoldingCacheOfDocument(editor.document.fileName, new Range(new Position(start, 0), new Position(end, 0)), summary);
  await refreshFoldings(editor, editor.visibleRanges);
};

export const refreshFoldings = async (editor: TextEditor, visibleRanges: readonly Range[]) => {
  const visibleLines = getVisibleRows(editor, visibleRanges);
  const cachedFoldings = Cache.getFoldingCacheOfDocument(editor.document.fileName)
  const provider: FoldingRangeProvider = {
    provideFoldingRanges(): FoldingRange[] {
      return cachedFoldings?.map(f => new FoldingRange(f.range.start.line, f.range.end.line, FoldingRangeKind.Region)) ?? [];
    }
  };
  foldingProvider?.dispose();
  foldingProvider = await languages.registerFoldingRangeProvider(SUPPORTED_LANGUAGES, provider);
  const foldings = cachedFoldings?.filter(f => visibleLines.has(f.range.start.line) && !visibleLines.has(f.range.start.line + 1));
  editor.setDecorations(foldingHideDecorationType, foldings ?? []);
  editor.setDecorations(foldingDecorationType, foldings?.map(i => createAnnotation(i.message, i.range)) ?? []);
};

export const clearFoldings = (editor: TextEditor) => {
  Cache.cleanFoldingCacheOfDocument(editor.document.fileName);
  refreshFoldings(editor, editor.visibleRanges);
};

export const createAnnotation = (content: string, range: Range, position: "before" | "after" = "before") => {
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

export const getCodeForRange = (document: TextDocument, range: Range): string => {
  let content: string = "";
  for (let i = range.start.line; i <= range.end.line; i++) {
    content += document.lineAt(i).text + "\n";
  }
  if (content.endsWith("\n"))
    content = content.substring(0, content.length - 3);
  return content;
};

export const getPositionsFromRange = (start: Position, stop: Position): Position[] => {
  const result: Position[] = [start];
  let b: Position = start;
  while (b.line < stop.line - 1) {
    b = new Position(b.line + 1, 0);
    result.push(b);
  }
  return result;
};

export const getVisibleRows = (editor: TextEditor, visibleRanges: readonly Range[] | undefined = undefined): Set<number> => {
  const visibleRows: Set<number> = new Set<number>();
  var _visibleRanges = visibleRanges;
  if (!_visibleRanges)
      _visibleRanges = editor.visibleRanges;
  _visibleRanges.forEach(r => {
      let start = r.start.line;
      while (start <= r.end.line) {
          visibleRows.add(start);
          start += 1;
      }
  });
  return visibleRows;
};

export const showInputDialog = async (originalName: string): Promise<string | undefined> => {
  return await window.showInputBox({
    title: `Enter a new name for '${originalName}':`,
    value: originalName,
    validateInput: (value) => value === originalName ? "Please choose a new name." : undefined,
  });
};

export const showScopePick = async (): Promise<boolean | undefined> => {
  const result = await showQuickPick("Choose the scope", ["Local (current file)", "Global (whole workspace)"]);
  if (result === undefined) return undefined;
  return result === "Local (current file)" ? false : true;
};

export const showQuickPick = async (title: string, items: string[]): Promise<string | undefined> => {
  return await window.showQuickPick(items, { canPickMany: false, title: title, });
};
