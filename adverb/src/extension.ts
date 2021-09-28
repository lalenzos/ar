import * as vscode from "vscode";
import { TreeViewProvider } from "./TreeViewProvider";

const SUPPORTED_LANGUAGES = ["javascript", "typescript"];

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand("adverb.rename", async () => {
		vscode.window.showInformationMessage("Hello World from adverb!");

		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;

		if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;

		const cursorPosition = editor.selection.start;
		const wordRange = editor.document.getWordRangeAtPosition(cursorPosition);
		if (!wordRange)
			return;
		const word = editor.document.getText(wordRange);
		if (!word)
			return;

		const items: string[] = ["Enter new name", "Remove vowals", "Change to camelCase", "Change to PascalCase", "Change to snake_case", "Change to kebab-case", "Change to UPPERCASE", "Change to lowercase"];
		const result = await vscode.window.showQuickPick(items, { canPickMany: false, title: `Choose a renaming technique or give a new name for '${word}':` });
		console.log(result);
		if (result === "Enter new name") {
			const newWord = await vscode.window.showInputBox({ title: `Enter the new name for '${word}':`, value: word, validateInput: (value) => value === word ? "Please choose a new name." : undefined })
			console.log(newWord);
		}
	}));

	context.subscriptions.push(vscode.window.registerTreeDataProvider("adverb.renamings", new TreeViewProvider()));
	context.subscriptions.push(vscode.window.createTreeView("adverb.renamings", { treeDataProvider: new TreeViewProvider() }));
}

export function deactivate() { }
