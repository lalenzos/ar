import * as vscode from "vscode";
import { getRenamingTypes, RenamingTreeItem, RenamingConfiguration } from "./models";
import { TreeViewProvider } from "./treeViewProvider";
import renaming from "./ast";
import configuration from "./configuration";

const SUPPORTED_LANGUAGES = ["javascript", "typescript"];
let treeViewProvider: TreeViewProvider;

const refresh = (positions: vscode.Position[] | undefined = undefined) => {
	const editor = vscode.window.activeTextEditor;
	if (!editor || !SUPPORTED_LANGUAGES.includes(editor.document.languageId))
		return;

	renaming.refresh(editor, positions);
	treeViewProvider.refresh(editor.document.uri);
};

const showQuickPick = async (title: string, items: string[]): Promise<string | undefined> => {
	return await vscode.window.showQuickPick(items, {
		canPickMany: false,
		title: title
	});
}

const showInputDialog = async (originalName: string): Promise<string | undefined> => {
	return await vscode.window.showInputBox({
		title: `Enter a new name for '${originalName}':`,
		value: originalName,
		validateInput: (value) => value === originalName ? "Please choose a new name." : undefined
	})
}

export function activate(context: vscode.ExtensionContext) {
	treeViewProvider = new TreeViewProvider();

	vscode.window.onDidChangeActiveTextEditor((editor) => refresh(), null, context.subscriptions);
	vscode.window.onDidChangeTextEditorSelection((event) => refresh(event.selections.map(x => x.start)), null, context.subscriptions);
	vscode.workspace.onDidChangeConfiguration((event) => { event.affectsConfiguration("adverb") && refresh() });
	vscode.workspace.onDidChangeTextDocument(
		(event) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor || event.document !== editor.document)
				return;

			if (event.contentChanges.length === 1)
				refresh([event.contentChanges[0].range.start]);
			else
				refresh();
		},
		null, context.subscriptions
	);

	vscode.commands.registerCommand("adverb.rename", async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || !SUPPORTED_LANGUAGES.includes(editor.document.languageId))
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
		const result = await showQuickPick(`Choose a new name or a renaming technique for '${originalName}':`, items);
		const renamingType = renamingTypes.find(x => x.description === result);
		if (renamingType) {
			let newName: string | undefined;
			if (renamingType.getNewNameFunction)
				newName = renamingType.getNewNameFunction(originalName);
			else
				newName = await showInputDialog(originalName);
			if (newName && newName !== originalName) {
				const renamingConfiguration: RenamingConfiguration = new RenamingConfiguration(originalName, newName, renamingType.id);
				const update = await configuration.updateRenamingConfiguration(editor.document.uri, originalName, renamingConfiguration);
				if (update) {
					refresh();
					vscode.window.showInformationMessage(`'${originalName}' successfully renamed to '${newName}'.`);
				}
			}
		}
	});

	vscode.commands.registerCommand("adverb.renameAll", async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || !SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;

		const renamingTypes = getRenamingTypes();
		const items: string[] = renamingTypes.filter(x => x.onlyForSingleRenaming === false).map(x => x.description);
		const result = await showQuickPick(`Choose a renaming technique:`, items);
		const renamingType = renamingTypes.find(x => x.description === result);
		if (renamingType) {
			const update = await configuration.updateSourceCodeFileConfigurationsRenaming(editor.document.uri, renamingType);
			if (update) {
				refresh();
				vscode.window.showInformationMessage(`All symbols successfully renamed.`);
			}
		}
	});


	// TREEVIEW
	vscode.window.registerTreeDataProvider("adverb.renamings", treeViewProvider);
	vscode.commands.registerCommand("adverb.refreshRenamings", () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;

		treeViewProvider.refresh(editor.document.uri);
	});
	vscode.commands.registerCommand("adverb.editRenaming", async (node: RenamingTreeItem) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;

		if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;

		const value = await configuration.getRenamingConfiguration(editor.document.uri, node.originalName);
		if (value) {
			const newName = await showInputDialog(node.originalName);
			if (newName) {
				value.newName = newName;
				const update = await configuration.updateRenamingConfiguration(editor.document.uri, node.originalName, value);
				if (update) {
					refresh();
					vscode.window.showInformationMessage(`'${value.originalName}' successfully updated to '${newName}'.`);
				}
			}
		}
	});
	vscode.commands.registerCommand("adverb.deleteRenaming", async (node: RenamingTreeItem) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;

		if (node.originalName === "all symbol names") {
			const result = await configuration.updateSourceCodeFileConfigurationsRenaming(editor.document.uri, undefined);
			if (result)
				vscode.window.showInformationMessage(`Renaming of all symbols removed.`);
		} else {
			const value = await configuration.getRenamingConfiguration(editor.document.uri, node.originalName);
			if (value) {
				const result = await configuration.removeRenamingConfiguration(editor.document.uri, value);
				if (result)
					vscode.window.showInformationMessage(`Renaming ('${value.originalName}' -> '${value.newName}') successfully removed.`);
			}
		}

		refresh();
	});
}

export function deactivate() { }
