import * as vscode from "vscode";
import { Cache } from "./cache";
import { FoldCommand, RenameAllCommand, RenameSingleCommand } from "./commands";
import { registerEvents } from "./events";
import { Settings } from "./settings";
import { GlobalRenamingTreeViewProvider, LocalRenamingTreeViewProvider, FoldingTreeViewProvider } from "./treeViews";
import { initializeTreeViews, refreshFoldings, refreshRenamings } from "./utils";

export function activate(context: vscode.ExtensionContext) {
  Settings.readSettings();
  Cache.initialize(context);

  let globalTreeViewProvider = new GlobalRenamingTreeViewProvider();
  let localTreeViewProvider = new LocalRenamingTreeViewProvider();
  let foldingTreeViewProvider = new FoldingTreeViewProvider();
  initializeTreeViews(globalTreeViewProvider, localTreeViewProvider, foldingTreeViewProvider)

  context.subscriptions.push(new FoldCommand());
  context.subscriptions.push(new RenameAllCommand());
  context.subscriptions.push(new RenameSingleCommand());

  context.subscriptions.push(globalTreeViewProvider);
  context.subscriptions.push(localTreeViewProvider);
  context.subscriptions.push(foldingTreeViewProvider);

  registerEvents(context);

  refreshRenamings();
  refreshFoldings();
}

export function deactivate() { }
