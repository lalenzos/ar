import * as vscode from "vscode";
import { getRenamingTypes, StateObject } from "./models";
import { TreeViewProvider } from "./TreeViewProvider";
import workspaceState from "./workspaceState";
import renaming from "./renaming";

const SUPPORTED_LANGUAGES = ["javascript", "typescript"];

export function activate(context: vscode.ExtensionContext) {
	workspaceState.initialize(context);

	const treeViewProvider = new TreeViewProvider();

	vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration("adverb")) {
			const editor = vscode.window.activeTextEditor;
			if (!editor)
				return;

			if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId))
				return;

			renaming.refresh(editor);
			treeViewProvider.refresh();
		}
	});

	vscode.window.onDidChangeActiveTextEditor(
		(editor: vscode.TextEditor | undefined) => {
			if (!editor)
				return;

			if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId))
				return;

			renaming.refresh(editor);
		},
		null,
		context.subscriptions
	);

	vscode.workspace.onDidChangeTextDocument(
		(event) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor || event.document !== editor.document)
				return;

			if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId))
				return;

			if (event.contentChanges.length === 1)
				renaming.refresh(editor, [event.contentChanges[0].range.start]);
			else
				renaming.refresh(editor);
		},
		null,
		context.subscriptions
	);

	vscode.window.onDidChangeTextEditorSelection(
		(event) => {
			const editor = event.textEditor;
			if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId))
				return;

			renaming.refresh(editor, event.selections.map(x => x.start));
		},
		null,
		context.subscriptions
	);

	vscode.commands.registerCommand("adverb.rename", async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;

		if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;

		const cursorPosition = editor.selection.start;
		const wordRange = editor.document.getWordRangeAtPosition(cursorPosition);
		if (!wordRange) {
			vscode.window.showErrorMessage("No element to rename found.");
			return;
		}
		const originalName = editor.document.getText(wordRange);
		if (!originalName) {
			vscode.window.showErrorMessage("No element to rename found.");
			return;
		}
		if (!renaming.checkIfNameIsACodeSymbol(editor, originalName)) {
			vscode.window.showErrorMessage(`'${originalName}' is not a code symbol.`);
			return;
		}

		const renamingTypes = getRenamingTypes();
		const items: string[] = renamingTypes.map(x => x.description);
		const result = await vscode.window.showQuickPick(items, { canPickMany: false, title: `Choose a new name or a renaming technique for '${originalName}':` });
		const renamingType = renamingTypes.find(x => x.description === result);
		if (renamingType) {
			const newName = await renamingType.getNewNameFunction()(originalName);
			if (newName) {
				const stateObject: StateObject = new StateObject(originalName, newName, renamingType);
				const update = await workspaceState.updateValue(editor.document.uri, stateObject);
				if (update) {
					renaming.refresh(editor);
					vscode.window.showInformationMessage(`'${originalName}' successfully renamed to '${newName}'.`);
				}
			}
		}
	});

	vscode.window.registerTreeDataProvider("adverb.renamings", treeViewProvider);
}

export function deactivate() { }
