import * as recast from "recast"
import * as vscode from 'vscode'
import { removeShebang, ParameterPosition, showVariadicNumbers, IdentifierToRename } from "../utils"

export function getParameterName(editor: vscode.TextEditor, position: vscode.Position, key: number, namedValue?: string) {
    return new Promise(async (resolve, reject) => {
        let isVariadic = false;
        let parameters: any[];
        const description: any = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', editor.document.uri, position);
        const shouldHideRedundantAnnotations = vscode.workspace.getConfiguration('decorator-renaming').get('hideRedundantAnnotations');

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
            const hideSingleParameters = vscode.workspace.getConfiguration('decorator-renaming').get('hideSingleParameters');

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

            if (Array.isArray(item.arguments))
                nodeArr.push(...item.arguments); //ex: console.log(a, b, c, d, e) -> to get the single arguments
            if (Array.isArray(item.params))
                nodeArr.push(...item.params); //ex: function test(a, b, c, d, e) -> to get the single params
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

export async function getIdentifiersToRename(activeEditor: vscode.TextEditor, code: string, options: any): Promise<IdentifierToRename[]> {
    code = removeShebang(code);
    let javascriptAst: any = "";

    try {
        javascriptAst = recast.parse(code, options).program.body;
    } catch (err) {
        return [];
    }

    let arr = getNodes(javascriptAst, []);
    const nodes = arr.filter((node) => node.type === "Identifier");

    // const activeEditorSymbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', activeEditor.document.uri);

    const identifiers: IdentifierToRename[] = [];
    for (const node of nodes) {
        const name = node.name;
        const loc = node.loc;
        const range: vscode.Range = new vscode.Range(
            new vscode.Position(loc.start.line - 1, loc.start.column),
            new vscode.Position(loc.end.line - 1, loc.end.column),
        );
        const identifier: IdentifierToRename = { range: range, content: name };
        identifiers.push(identifier);
    }

    return identifiers;
};
