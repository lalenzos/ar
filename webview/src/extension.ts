import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("Extension 'webview' is now active!");
  let panel: vscode.WebviewPanel | undefined = undefined;

  context.subscriptions.push(
    vscode.commands.registerCommand("webview.show", () => {
      if (!vscode.window.activeTextEditor) {
        vscode.window.showErrorMessage("No active editor.");
        return;
      }
      const { document } = vscode.window.activeTextEditor;

      panel = vscode.window.createWebviewPanel(
        "webview",
        "Webview",
        vscode.ViewColumn.Two,
        {}
      );

      panel.webview.html = getWebviewContent(document);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((e) => {
      if (panel) panel.webview.html = getWebviewContent(e);
    })
  );
}

function getWebviewContent(document: vscode.TextDocument) {
  const newLines: vscode.TextLine[] = [];
  for (let i = 0; i < document.lineCount; i++) {
    let line = document.lineAt(i);
    if (
      line.isEmptyOrWhitespace ||
      line.text.trim().startsWith("//") ||
      line.text.trim().startsWith("/*") ||
      line.text.trim().startsWith("*")
    )
      continue;
    const newLineText = line.text
      .replace("public ", "")
      .replace("System.out.println", "sout")
      .replace("return", "rtn");
    const newLine: vscode.TextLine = {
      ...line,
      text: newLineText,
    };
    newLines.push(newLine);
  }
  const content = newLines.map((x) => x.text).join("<br />");

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Webview</title>
  </head>
  <body>
      <p>${content}</p>
  </body>
  </html>`;
}

export function deactivate() {}
