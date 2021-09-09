import * as recast from "recast"
import * as vscode from 'vscode'
import { removeShebang, ParameterPosition, showVariadicNumbers, CodePartToHide } from "../utils"

export function getParameterName(editor: vscode.TextEditor, position: vscode.Position, key: number, namedValue?: string) {
    return new Promise(async (resolve, reject) => {
        let isVariadic = false;
        let parameters: any[];
        const description: any = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', editor.document.uri, position);
        const shouldHideRedundantAnnotations = vscode.workspace.getConfiguration('decorator-hiding').get('hideRedundantAnnotations');

        if (description && description.length > 0) {
            try {
                const functionDefinitionRegex = /[^ ](?!^)\((.*)\)\:/gm;
                let definition = description[0].contents[0].value.match(functionDefinitionRegex);

                if (!definition || definition.length === 0)
                    return reject();

                definition = definition[0].slice(2, -2);

                const jsParameterNameRegex = /^[a-zA-Z_$]([0-9a-zA-Z_$]+)?/g;

                parameters = definition.split(',')
                    .map((parameter: any) => parameter.trim())
                    .map((parameter: any) => {
                        if (parameter.startsWith('...')) {
                            isVariadic = true;
                            parameter = parameter.slice(3);
                        }

                        const matches = parameter.match(jsParameterNameRegex);
                        if (matches && matches.length)
                            return matches[0]

                        return parameter;
                    })
            } catch (err) {
                console.error(err);
            }
        }

        if (!parameters)
            return reject();

        if (isVariadic && key >= parameters.length - 1) {
            let name = parameters[parameters.length - 1];

            if (shouldHideRedundantAnnotations && name === namedValue)
                return reject();

            name = showVariadicNumbers(name, -parameters.length + 1 + key);
            return resolve(name);
        }

        if (parameters[key]) {
            let name = parameters[key];
            if (shouldHideRedundantAnnotations && name === namedValue)
                return reject();

            return resolve(name);
        }

        return reject();
    })
}

export function parse(code: string, options: any): ParameterPosition[] {
    code = removeShebang(code);
    let javascriptAst: any = "";

    const editor = vscode.window.activeTextEditor;

    try {
        javascriptAst = recast.parse(code, options).program.body;
    } catch (err) {
        return [];
    }

    return lookForFunctionCalls(editor, javascriptAst);
}

function lookForFunctionCalls(editor: vscode.TextEditor, body: any): ParameterPosition[] {
    let arr = getNodes(body, []);

    const nodes = arr.filter((node) => node.type === "CallExpression" || node.type === "NewExpression");

    const calls = [];
    nodes.forEach((node) => {
        if (node.type === "NewExpression")
            calls.push(node, ...node.arguments);
        else
            calls.push(node);
    });

    const parameters: ParameterPosition[] = [];
    for (const call of calls) {
        if (call.callee && call.callee.loc && call.arguments) {
            const hideSingleParameters = vscode.workspace.getConfiguration('decorator-hiding').get('hideSingleParameters');

            if (hideSingleParameters && call.arguments.length === 1)
                continue;

            const expression = getExpressionLoc(call);

            call.arguments.forEach((argument: any, key: number) => parameters.push(parseParam(argument, key, expression, editor)));
        }
    }

    return parameters;
}

function getNodes(astNode, nodeArr) {
    // Loop through all keys in the current node
    for (const key in astNode) {
        if (astNode.hasOwnProperty(key)) {
            const item = astNode[key];

            if (item === undefined || item === null)
                continue;

            if (Array.isArray(item))
                // If the current node is an array of nodes, loop through each
                item.forEach((subItem) => nodeArr = getNodes(subItem, nodeArr));
            else if (item.loc !== undefined) {
                // If is a proper node and has a location in the source, push it into the array and recurse on that for nodes inside this node
                nodeArr.push(item);
                nodeArr = getNodes(item, nodeArr);
            }
        }
    }
    return nodeArr;
}

function parseParam(argument: any, key: number, expression: any, editor: vscode.TextEditor): ParameterPosition {
    const parameter: ParameterPosition = {
        namedValue: argument.name ?? null,
        expression: { line: expression.start.line, character: expression.start.column },
        key: key,
        start: { line: argument.loc.start.line - 1, character: argument.loc.start.column },
        end: { line: argument.loc.end.line - 1, character: argument.loc.end.column }
    };

    // TSTypeAssertions are off by one for some reason so subtract the column by one.
    if (argument.type === "TSTypeAssertion")
        parameter.start.character -= 1;

    const line = editor.document.lineAt(parameter.start.line);

    const offset = editor.options.insertSpaces ? 0 : line.firstNonWhitespaceCharacterIndex * 3;

    parameter.expression.character -= offset;
    parameter.start.character -= offset;
    parameter.end.character -= offset;

    return parameter;
}

function getExpressionLoc(call: any) {
    if (call.callee.type === "MemberExpression" && call.callee.property.loc) {
        const { start, end } = call.callee.property.loc;

        return {
            start: { line: start.line - 1, column: start.column },
            end: { line: end.line - 1, column: end.column }
        };
    }

    if (call.callee.type === "CallExpression") {
        const { start, end } = call.callee.arguments[0].loc;

        return {
            start: { line: start.line - 1, column: start.column },
            end: { line: end.line - 1, column: end.column }
        };
    }

    const { start, end } = call.callee.loc;
    return {
        start: { line: start.line - 1, column: start.column },
        end: { line: end.line - 1, column: end.column }
    };
};

export function getJavascriptCodePartsToHide(code: string, options: any): CodePartToHide[] {
    code = removeShebang(code);
    let javascriptAst: any = "";

    try {
        javascriptAst = recast.parse(code, options).program.body;
    } catch (err) {
        return [];
    }

    let arr = getNodes(javascriptAst, []);
    const nodes = arr.filter((node) => node.type === "VariableDeclaration");

    const codePartsToHide: CodePartToHide[] = [];
    for (const node of nodes) {
        const keyword = node.loc.tokens.find(x => x.type === "Keyword" &&
            x.loc.start.line === node.loc.start.line && x.loc.start.column >= node.loc.start.column &&
            x.loc.end.line === node.loc.end.line && x.loc.end.column <= node.loc.end.column);
        if (keyword) {
            const range: vscode.Range = new vscode.Range(
                new vscode.Position(keyword.loc.start.line - 1, keyword.loc.start.column),
                new vscode.Position(keyword.loc.end.line - 1, keyword.loc.end.column),
            );
            const codePartToHide: CodePartToHide = { range: range, hoverMessage: keyword.value };
            codePartsToHide.push(codePartToHide);
        }
    }

    return codePartsToHide;
};

export function getTypescriptCodePartsToHide(code: string, options: any): CodePartToHide[] {
    code = removeShebang(code);
    let javascriptAst: any = "";

    try {
        javascriptAst = recast.parse(code, options).program.body;
    } catch (err) {
        return [];
    }

    let arr = getNodes(javascriptAst, []);
    const nodes = arr.filter((node) => node.type === "VariableDeclaration" || node.type === "ArrowFunctionExpression" || node.type === "FunctionDeclaration");

    const codePartsToHide: CodePartToHide[] = [];
    for (const node of nodes) {
        if (node.type === "VariableDeclaration") {

            const keywords = node.loc.tokens.filter(x =>
                (x.value === "const" || x.value === "let" || x.value === "var" || x.value === ":" || x.value === "string" || x.value === "number" || x.value === "boolean" || x.value === "decimal") &&
                x.loc.start.line === node.loc.start.line && x.loc.start.column >= node.loc.start.column);
            keywords.forEach(keyword => {
                const range: vscode.Range = new vscode.Range(
                    new vscode.Position(keyword.loc.start.line - 1, keyword.loc.start.column),
                    new vscode.Position(keyword.loc.end.line - 1, keyword.loc.end.column),
                );
                const codePartToHide: CodePartToHide = { range: range, hoverMessage: keyword.value };
                codePartsToHide.push(codePartToHide);
            });
        }
        if (node.type === "ArrowFunctionExpression" || node.type === "FunctionDeclaration") {
            if (node.returnType) {
                const range: vscode.Range = new vscode.Range(
                    new vscode.Position(node.returnType.loc.start.line - 1, node.returnType.loc.start.column),
                    new vscode.Position(node.returnType.loc.end.line - 1, node.returnType.loc.end.column),
                );
                const codePartToHide: CodePartToHide = { range: range, hoverMessage: "" };
                codePartsToHide.push(codePartToHide);
            }
        }
    }

    return codePartsToHide;
};