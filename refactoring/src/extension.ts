import * as vscode from "vscode";

const prefix = "ADVERB_";

export function activate(context: vscode.ExtensionContext) {
  console.log("Extension 'refactoring' is now active!");

  vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
    //  vscode.commands.executeCommand("editor.action.rename", [document.uri, new vscode.Position(0, 5)]);
    const editor = vscode.window.activeTextEditor;
    if (editor)
      transform(editor.document);
  })

  vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    const editor = vscode.window.activeTextEditor;
    if (editor)
      transform(editor.document);
  })

  vscode.workspace.onWillSaveTextDocument((e: vscode.TextDocumentWillSaveEvent) => {
    const editor = vscode.window.activeTextEditor;
    if (editor)
      e.waitUntil(revert(editor.document));
  })
}

async function transform(document: vscode.TextDocument): Promise<void> {
  const symbols = await vscode.commands.executeCommand<any>("vscode.executeWorkspaceSymbolProvider", `m`)
    .then((symbols: vscode.SymbolInformation[]) => {
      return symbols;
    });

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      "vscode.executeDocumentRenameProvider",
      document.uri,
      symbol.location.range.start,
      `${prefix}${symbol.name}`
    )
      .then((edit: vscode.WorkspaceEdit | undefined) => {
        if (!edit)
          return false;
        return vscode.workspace.applyEdit(edit);
      });
  };
}

async function revert(document: vscode.TextDocument) {
  const symbols = await vscode.commands.executeCommand<any>("vscode.executeWorkspaceSymbolProvider", `${prefix}`)
    .then((symbols: vscode.SymbolInformation[]) => {
      return symbols;
    });

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
      "vscode.executeDocumentRenameProvider",
      document.uri,
      symbol.location.range.start,
      symbol.name.replace(prefix, "")
    )
      .then((edit: vscode.WorkspaceEdit | undefined) => {
        if (!edit)
          return false;
        return vscode.workspace.applyEdit(edit);
      });
  };
}

export function deactivate() { }
