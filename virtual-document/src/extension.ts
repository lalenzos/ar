import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("Extension 'virtual-document' is now active!");

  const scheme = "virtual-document";

  const provider = new (class implements vscode.TextDocumentContentProvider {
    // emitter and its event
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    provideTextDocumentContent(uri: vscode.Uri): string {
      if (!vscode.window.activeTextEditor) return "";
      const { document } = vscode.window.activeTextEditor;
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
      return newLines.map((x) => x.text).join("\r\n");
    }
  })();

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(scheme, provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("virtual-document.showAdverb", async () => {
      if (!vscode.window.activeTextEditor) {
        vscode.window.showErrorMessage("No active editor.");
        return;
      }
      const { document } = vscode.window.activeTextEditor;
      const uri = vscode.Uri.parse(
        `${scheme}:${document.fileName.split(/(\\|\/)/g).pop()}`
      );
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: false });
    })
  );
}

export function deactivate() {}
