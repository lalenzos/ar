import * as vscode from "vscode";

const prefix = "ADVERB_";

export function activate(context: vscode.ExtensionContext) {
  console.log("Extension 'refactoring' is now active!");

  vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
    //  vscode.commands.executeCommand("editor.action.rename", [editor.document.uri, new vscode.Position(0, 5)]);
    const editor = vscode.window.activeTextEditor;
    if (editor)
      transform(editor.document);
  })

  vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    // transform(document);
  })

  vscode.workspace.onWillSaveTextDocument((e: vscode.TextDocumentWillSaveEvent) => {
    const editor = vscode.window.activeTextEditor;
    if (editor)
      e.waitUntil(Promise.resolve(revert(editor.document))); //TODO: not working
  })
}

function transform(document: vscode.TextDocument): void {
  vscode.commands.executeCommand<any>("vscode.executeWorkspaceSymbolProvider", "monthName")
    .then((symbols: vscode.SymbolInformation[]) => {
      symbols.forEach(symbol => {

        vscode.commands.executeCommand<vscode.WorkspaceEdit>(
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
      });

    });
}

function revert(document: vscode.TextDocument): void {
  vscode.commands.executeCommand<any>("vscode.executeWorkspaceSymbolProvider", `${prefix}monthName`)
    .then((symbols: vscode.SymbolInformation[]) => {
      symbols.forEach(symbol => {

        vscode.commands.executeCommand<vscode.WorkspaceEdit>(
          "vscode.executeDocumentRenameProvider",
          document.uri,
          symbol.location.range.start,
          "monthName"
        )
          .then((edit: vscode.WorkspaceEdit | undefined) => {
            if (!edit)
              return false;
            return vscode.workspace.applyEdit(edit);
          });

      });
    });
}

export function deactivate() { }
