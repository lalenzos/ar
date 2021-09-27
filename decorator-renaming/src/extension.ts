import * as vscode from "vscode"
import * as javascriptDriver from "./drivers/javascript"
import * as javascriptReactDriver from "./drivers/javascriptreact"
import * as typescriptDriver from "./drivers/typescript"
import * as typescriptReactDriver from "./drivers/typescriptreact"
import { Annotations } from "./annotationProvider"
import Commands from "./commands"
import { IdentifierToRename, LanguageDriver, ParameterPosition } from "./utils"

const hintDecorationType = vscode.window.createTextEditorDecorationType({});
const hideIdentifierDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor("editor.background"),
    color: new vscode.ThemeColor("editor.background"),
    letterSpacing: "-100em"
});
const hintIdentifierType = vscode.window.createTextEditorDecorationType({});

async function updateDecorations(activeEditor: vscode.TextEditor, languageDrivers: Record<string, LanguageDriver>, dynamic: boolean = false) {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: 'Decorator renaming...'
    }, async (progress) => {
        return new Promise(async (resolve) => {
            progress.report({ increment: 0 });

            if (!activeEditor) {
                resolve(undefined);
                return;
            }

            if (!(activeEditor.document.languageId in languageDrivers)) {
                resolve(undefined);
                return;
            }

            const driver: LanguageDriver = languageDrivers[activeEditor.document.languageId];
            const isEnabled = vscode.workspace.getConfiguration("decorator-renaming").get("enabled");

            if (!isEnabled) {
                activeEditor.setDecorations(hintDecorationType, []);
                resolve(undefined);
                return;
            }

            const code = activeEditor.document.getText();
            let languageParameters: ParameterPosition[] = [];

            try {
                languageParameters = driver.parse(code);
            } catch (err) {
                console.log(err);
                // Error parsing language"s AST, likely a syntax error on the user"s side
            }

            if (languageParameters.length === 0){
                resolve(undefined);
                return;
            }

            const languageFunctions: vscode.DecorationOptions[] = [];

            for (let index = 0; index < languageParameters.length; index++) {
                var parameter = languageParameters[index];

                const start = new vscode.Position(parameter.start.line, parameter.start.character);
                const end = new vscode.Position(parameter.end.line, parameter.end.character);

                let parameterName: any;

                try {
                    parameterName = await driver.getParameterName(
                        activeEditor,
                        new vscode.Position(parameter.expression.line, parameter.expression.character),
                        parameter.key,
                        parameter.namedValue
                    );
                } catch (err) {
                    // Error getting a parameter name, just ignore it
                }

                if (!parameterName)
                    continue;

                const leadingCharacters = vscode.workspace.getConfiguration("decorator-renaming").get("leadingCharacters");
                const trailingCharacters = vscode.workspace.getConfiguration("decorator-renaming").get("trailingCharacters");
                const parameterCase = vscode.workspace.getConfiguration("decorator-renaming").get("parameterCase");

                if (parameterCase === "uppercase")
                    parameterName = parameterName.toUpperCase();

                if (parameterCase === "lowercase")
                    parameterName = parameterName.toLowerCase();

                const annotation = Annotations.parameterAnnotation(leadingCharacters + parameterName + trailingCharacters, new vscode.Range(start, end));
                languageFunctions.push(annotation);
            }
            progress.report({ increment: 50 });
            activeEditor.setDecorations(hintDecorationType, languageFunctions);

            let identifiers: IdentifierToRename[] = [];
            try {
                identifiers = await driver.getIdentifiersToRename(activeEditor, code);
            } catch (err) {
                console.log(err);
            }

            if (identifiers.length === 0) {
                resolve(undefined);
                return;
            }

            activeEditor.setDecorations(hideIdentifierDecorationType, identifiers);

            const decoratedIdentifiers = identifiers.map(i => {
                // return Annotations.parameterAnnotation(`_THIS-IS-A-TEST-HOWEVER-THIS-STRING-SHOULD-BE-EXTREMELY-LONG-FOR-TEST-PURPOSES-THEREFORE-I-AM-ADDING-MORE-TEXT-TO-GET-AN-EVEN-LONGER-TEXT_${i.content}_`, i.range, true);
                return Annotations.parameterAnnotation(`${dynamic ? "D" : ""}_${i.content}_${dynamic ? "D" : ""}`, i.range, true)
            });
            progress.report({ increment: 90 });
            activeEditor.setDecorations(hintIdentifierType, decoratedIdentifiers);
            resolve(undefined);
        });
    });
}

export function activate(context: vscode.ExtensionContext) {
    const languageDrivers: Record<string, LanguageDriver> = {
        javascript: javascriptDriver,
        javascriptreact: javascriptReactDriver,
        typescript: typescriptDriver,
        typescriptreact: typescriptReactDriver,
    };

    let timeout: NodeJS.Timer | undefined = undefined;
    let activeEditor: vscode.TextEditor = vscode.window.activeTextEditor;

    Commands.registerCommands();

    vscode.commands.registerCommand('decorator-renaming.dynamic', () => {
        updateDecorations(activeEditor, languageDrivers, true);
    })

    function triggerUpdateDecorations(timer: boolean = true) {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }

        timeout = setTimeout(() => updateDecorations(activeEditor, languageDrivers), timer ? 2500 : 25);
    }

    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("decorator-renaming"))
            triggerUpdateDecorations(false);
    });

    vscode.window.onDidChangeActiveTextEditor(
        (editor: vscode.TextEditor) => {
            activeEditor = editor;
            if (editor)
                triggerUpdateDecorations(false);
        },
        null,
        context.subscriptions
    );

    vscode.workspace.onDidChangeTextDocument(
        (event) => {
            if (activeEditor && event.document === activeEditor.document)
                triggerUpdateDecorations(false);
        },
        null,
        context.subscriptions
    );

    if (activeEditor)
        triggerUpdateDecorations();
}
