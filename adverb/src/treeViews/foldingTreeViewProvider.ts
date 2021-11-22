import { commands, Disposable, window } from "vscode";
import configuration from "../configuration";
import { BaseTreeViewProvider } from "./_helpers";
import { FoldingTreeItem } from "./nodes";
import { Commands } from "../commands";
import { refreshFoldings, SUPPORTED_LANGUAGES } from "../utils";

export class FoldingTreeViewProvider extends BaseTreeViewProvider<FoldingTreeItem> {
  constructor(){
    super("adverb.foldings");
  }

  async getChildren(element?: FoldingTreeItem): Promise<FoldingTreeItem[]> {
    if (element || !this.uri) return [];

    const result: FoldingTreeItem[] = [];
    const foldings = await configuration.getFoldings(this.uri);
    if (foldings) {
      Object.keys(foldings).forEach((x) => {
        const folding = foldings[x];
        result.push(new FoldingTreeItem(folding.start, folding.end, folding.message));
      });
    }
    return result;
  }

  registerCommands(): Disposable[] {
    return [
      commands.registerCommand("adverb.refreshFoldings", () => refreshFoldings(), this),
      commands.registerCommand("adverb.expandAllFoldings", () => this.expandAll(), this),
      commands.registerCommand("adverb.collapseAllFoldings", () => this.collapseAll(), this),
      commands.registerCommand("adverb.editFolding", (n: FoldingTreeItem) => this.editFolding(n), this),
      commands.registerCommand("adverb.deleteFolding", (n: FoldingTreeItem) => this.deleteFolding(n), this)
    ];
  }

  private async expandAll(){
    const editor = window.activeTextEditor;
		if (!editor || !SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;
		const foldings = await configuration.getFoldings(editor.document.uri);
		if (foldings)
			await commands.executeCommand("editor.unfold", { levels: 1, selectionLines: Object.keys(foldings).map(x => foldings[x].start) });
  }

  private async collapseAll(){
    const editor = window.activeTextEditor;
		if (!editor || !SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;
		const foldings = await configuration.getFoldings(editor.document.uri);
		if (foldings)
			await commands.executeCommand("editor.fold", { levels: 1, selectionLines: Object.keys(foldings).map(x => foldings[x].start) });
  }

  private async editFolding(node: FoldingTreeItem){
    const editor = window.activeTextEditor;
		if (!editor)
			return;
    const folding = await configuration.getFolding(editor.document.uri, node.start, node.end);
		if (folding)
      commands.executeCommand(Commands.Fold, node.start, node.end);
  }

  private async deleteFolding(node: FoldingTreeItem){
    const editor = window.activeTextEditor;
    if (!editor)
      return Promise.resolve();

    const result = await configuration.removeFolding(editor.document.uri, node);
    if (result) {
      window.showInformationMessage(`Folding [${node.start + 1}-${node.end + 1}] successfully removed.`);
      refreshFoldings();
    }
  }
}
