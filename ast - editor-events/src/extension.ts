import * as vscode from "vscode";
import { parse, ParseResult } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import { File, Identifier } from "@babel/types";

const prefix = "ADVERB_";

export function activate(context: vscode.ExtensionContext) {
  console.log("Extension 'astevents' is now active!");

  vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
    if (vscode.window.activeTextEditor)
      transform(vscode.window.activeTextEditor.document);
  })

  vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    transform(document);
  })

  vscode.workspace.onWillSaveTextDocument((e: vscode.TextDocumentWillSaveEvent) => {
    e.waitUntil(Promise.resolve(revert(e.document)));
  })
}

function transform(e: vscode.TextDocument): void {
  const code = e.getText();
  const ast = parse(code);
  const nodes = getRelevantNodes(ast);
  nodes.forEach(node => {
    node.name = `${prefix}${node.name}`;
  });

  const transformedCode = generate(ast).code;
  const edit = new vscode.WorkspaceEdit();
  const wholeDocument = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(e.lineCount, e.eol));
  const updateCode = new vscode.TextEdit(wholeDocument, transformedCode);
  edit.set(e.uri, [updateCode]);
  vscode.workspace.applyEdit(edit);
}

function revert(e: vscode.TextDocument): vscode.TextEdit[] {
  const code = e.getText();
  const ast = parse(code);
  const nodes = getRelevantNodes(ast);
  nodes.forEach(node => {
    node.name = node.name.replace(prefix, "");
  });

  const transformedCode = generate(ast).code;
  const wholeDocument = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(e.lineCount, e.eol));
  return [new vscode.TextEdit(wholeDocument, transformedCode)];
}

function getRelevantNodes(ast: ParseResult<File>): Identifier[] {
  const nodes: Identifier[] = [];
  traverse(ast, {
    enter(path) {
      if (path.isIdentifier() && //PROBLEM: also objects or methods are identifiers
        (
          (path.parentPath.isVariableDeclarator() && path.parentPath.node.id === path.node) || //variable declaration
          (path.parentPath.isAssignmentExpression() && (path.parentPath.node.left === path.node || path.parentPath.node.right === path.node)) || //variable assignment
          (path.parentPath.isMemberExpression() && path.parentPath.node.object === path.node) ||
          (path.parentPath.isCallExpression() && path.parentPath.node.arguments.includes(path.node)) || //call expression (console.log(var))
          (path.parentPath.isBinaryExpression() && (path.parentPath.node.left === path.node || path.parentPath.node.right === path.node)) || //if clause
          (path.parentPath.isSwitchStatement() && path.parentPath.node.discriminant === path.node) || //switch statement
          (path.parentPath.isSwitchCase() && path.parentPath.node.test === path.node) //switch clause
        )
      )
        nodes.push(path.node);
    }
  });
  return nodes;
}

export function deactivate() { }
