import * as vscode from "vscode";

export class Folding {
    constructor(public range: vscode.Range, public message: string) { }
};