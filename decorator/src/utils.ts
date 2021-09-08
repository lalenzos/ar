import * as vscode from "vscode";

export interface ParameterPosition {
    namedValue?: string;
    expression: { line: number, character: number };
    key: number;
    start: { line: number, character: number };
    end: { line: number, character: number };
}

export interface LanguageDriver {
    getParameterName(editor: vscode.TextEditor, position: vscode.Position, key: number, namedValue?: string): any
    parse(code: string): ParameterPosition[]
}

export function removeShebang(sourceCode: string): string {
    const sourceCodeArr = sourceCode.split("\n")
    if (sourceCodeArr[0].substr(0, 2) === "#!")
        sourceCodeArr[0] = "";

    return sourceCodeArr.join("\n");
}

export function showVariadicNumbers(str: string, number: number): string {
    const showVariadicNumbers = vscode.workspace.getConfiguration('decorator').get('showVariadicNumbers');
    if (showVariadicNumbers)
        return `${str}[${number}]`;

    return str;
}
