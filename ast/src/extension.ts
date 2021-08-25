import * as vscode from "vscode";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";

export function activate(context: vscode.ExtensionContext) {
  console.log("Extension 'ast' is now active!");

  context.subscriptions.push(
    vscode.commands.registerCommand("ast.transform", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor.");
        return;
      }

      const code = editor.document.getText();
      const transformedCode = transform(code);

      const edit = new vscode.WorkspaceEdit();
      const wholeDocument = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(editor.document.lineCount, 0));
      const updateCode = new vscode.TextEdit(wholeDocument, transformedCode);
      edit.set(editor.document.uri, [updateCode]);
      vscode.workspace.applyEdit(edit);
    })
  );
}

function transform(code: string): string {
  const ast = parse(code);
  traverse(ast, {
    enter(path) {
      if (path.isIdentifier() && //PROBLEM: also objects or methods are identifiers
        (
          (path.parentPath.isVariableDeclarator() && path.parentPath.node.id === path.node) || //variable declaration
          (path.parentPath.isAssignmentExpression() && (path.parentPath.node.left === path.node || path.parentPath.node.right === path.node)) || //variable assignment
          (path.parentPath.isMemberExpression() && path.parentPath.node.object === path.node) ||
          (path.parentPath.isCallExpression() && path.parentPath.node.arguments.includes(path.node)) || //call expression (console.log(var))
          (path.parentPath.isBinaryExpression() && (path.parentPath.node.left === path.node || path.parentPath.node.right === path.node)) || //if clause
          (path.parentPath.isSwitchStatement() && path.parentPath.node.discriminant == path.node) || //switch statement
          (path.parentPath.isSwitchCase() && path.parentPath.node.test == path.node) //switch clause
        )
      )
        path.node.name = `ADVERB_${path.node.name}`
    }
  })
  return generate(ast).code;
}

export function deactivate() { }
