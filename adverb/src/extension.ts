import * as vscode from "vscode";
import { getRenamingTypes, RenamingConfiguration, FoldingConfiguration } from "./models";
import ast from "./ast";
import configuration from "./configuration";
import { FoldingTreeItem, FoldingTreeViewProvider, RenamingTreeItem, RenamingTreeViewProvider } from "./treeViews";

export const SUPPORTED_LANGUAGES = ["javascript", "typescript"];

let renamingTimeout: NodeJS.Timer | undefined = undefined;
let foldingTimeout: NodeJS.Timer | undefined = undefined;
let globalTreeViewProvider: RenamingTreeViewProvider;
let localTreeViewProvider: RenamingTreeViewProvider;
let foldingTreeViewProvider: FoldingTreeViewProvider;

const refreshRenamings = (positions: vscode.Position[] | undefined = undefined) => {
	if (renamingTimeout) {
		clearTimeout(renamingTimeout);
		renamingTimeout = undefined;
	}
	renamingTimeout = setTimeout(() => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			ast.refreshRenamings(editor, positions);
			localTreeViewProvider.refresh(editor?.document.uri);
		}
		globalTreeViewProvider.refresh();
	}, 100);
};

const refreshFoldings = (visibleRanges: vscode.Range[] | undefined = undefined) => {
	if (foldingTimeout) {
		clearTimeout(foldingTimeout);
		foldingTimeout = undefined;
	}
	foldingTimeout = setTimeout(async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			await updateEditorFoldingRanges(editor);
			ast.refreshFoldings(editor, visibleRanges);
			foldingTreeViewProvider.refresh(editor?.document.uri);
		}
	}, 100);
};

const getPositionRanges = (start: vscode.Position, stop: vscode.Position): vscode.Position[] => {
	const result: vscode.Position[] = [start];
	let b: vscode.Position = start;
	while (b.line < stop.line - 1) {
		b = new vscode.Position(b.line + 1, 0);
		result.push(b);
	}
	result.push(stop);
	return result;
};

const showQuickPick = async (title: string, items: string[]): Promise<string | undefined> => {
	return await vscode.window.showQuickPick(items, { canPickMany: false, title: title });
};

const showScopePick = async (): Promise<boolean | undefined> => {
	const result = await showQuickPick("Choose the scope", ["Local (current file)", "Global (whole workspace)"]);
	if (result === undefined)
		return undefined;
	return result === "Local (current file)" ? false : true;
}

const showInputDialog = async (originalName: string): Promise<string | undefined> => {
	return await vscode.window.showInputBox({
		title: `Enter a new name for '${originalName}':`,
		value: originalName,
		validateInput: (value) => value === originalName ? "Please choose a new name." : undefined
	});
};

const deleteLocalRenaming = async (editor: vscode.TextEditor, originalName: string) => {
	if (originalName === "all symbol names") {
		const result = await configuration.updateLocalFileRenaming(editor.document.uri, undefined);
		if (result)
			vscode.window.showInformationMessage(`Renaming of all symbols removed.`);
	} else {
		const value = await configuration.getRenaming(editor.document.uri, originalName);
		if (value) {
			const result = await configuration.removeLocalRenaming(editor.document.uri, value);
			if (result)
				vscode.window.showInformationMessage(`Renaming ('${value.originalName}' -> '${value.newName}') successfully removed.`);
		}
	}
};

const addFolding = async (editor: vscode.TextEditor, initialMin?: number, initialMax?: number): Promise<FoldingConfiguration | undefined> => {
	let min = 1;
	let max = editor.document.lineCount;
	const startInput = await vscode.window.showInputBox({
		title: `Enter the starting line number:`, value: (initialMin ?? min).toString(),
		validateInput: (value: string) => {
			if (isNaN(parseInt(value))) return "Please enter a valid line number.";
			if (parseInt(value) < min! || parseInt(value) > max! - 1) return "Please choose a valid line number.";
			return undefined;
		}
	});
	if (!startInput) return;
	const start = parseInt(startInput) - 1;
	const endInput = await vscode.window.showInputBox({
		title: `Enter the ending line number:`, value: (initialMax ?? start + 2).toString(),
		validateInput: (value: string) => {
			if (isNaN(parseInt(value))) return "Please enter a valid line number.";
			if (parseInt(value) < start + 2 || parseInt(value) > max!) return "Please choose a valid line number.";
			return undefined;
		}
	});
	if (!endInput) return;
	const end = parseInt(endInput) - 1;
	const foldingConfiguration = new FoldingConfiguration(start, end, "*** Message ***");
	const foldings = await configuration.getFoldings(editor.document.uri);
	if (foldings)
		await Object.values(foldings).filter(f => f.start === start).forEach(async f => await configuration.removeFolding(editor.document.uri, f));
	await configuration.updateFolding(editor.document.uri, foldingConfiguration);
	await updateEditorFoldingRanges(editor);
	await vscode.commands.executeCommand("editor.fold", { levels: 1, selectionLines: [start] });
	return foldingConfiguration;
};

const updateEditorFoldingRanges = async (editor: vscode.TextEditor) => {
	const foldings = await configuration.getFoldings(editor.document.uri);
	if (foldings) {
		await vscode.languages.registerFoldingRangeProvider(SUPPORTED_LANGUAGES, {
			provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
				const result: vscode.FoldingRange[] = [];
				Object.keys(foldings).forEach(f => {
					const folding = foldings[f];
					result.push(new vscode.FoldingRange(folding.start, folding.end, vscode.FoldingRangeKind.Region));
				});
				return result;
			}
		});
	}
}



export function activate(context: vscode.ExtensionContext) {
	globalTreeViewProvider = new RenamingTreeViewProvider(true);
	localTreeViewProvider = new RenamingTreeViewProvider(false);
	foldingTreeViewProvider = new FoldingTreeViewProvider();

	vscode.window.onDidChangeActiveTextEditor(() => {
		refreshRenamings();
		refreshFoldings();
	}, null, context.subscriptions);
	vscode.window.onDidChangeTextEditorSelection((event) => {
		refreshRenamings(event.selections.length > 0 ? getPositionRanges(event.selections[0].start, event.selections[0].end) : []);
		refreshFoldings();
	}, null, context.subscriptions);
	vscode.window.onDidChangeTextEditorVisibleRanges((event: vscode.TextEditorVisibleRangesChangeEvent) => {
		refreshFoldings(event.visibleRanges as vscode.Range[]);
	});
	vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration("adverb")) {
			refreshRenamings();
			refreshFoldings();
		}
	}, null, context.subscriptions);
	vscode.workspace.onDidChangeTextDocument((event) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || event.document !== editor.document)
			return;

		if (event.contentChanges.length === 1)
			refreshRenamings([event.contentChanges[0].range.start]);
		else
			refreshRenamings();
		refreshFoldings();
	}, null, context.subscriptions);

	vscode.commands.registerCommand("adverb.rename", async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || !SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;

		const cursorPosition = editor.selection.start;
		const wordRange = editor.document.getWordRangeAtPosition(cursorPosition);
		if (!wordRange) {
			vscode.window.showErrorMessage("No symbol to rename found.");
			return;
		}
		const originalName = editor.document.getText(wordRange);
		if (!originalName) {
			vscode.window.showErrorMessage("No symbol to rename found.");
			return;
		}
		if (!ast.checkIfNameIsACodeSymbol(editor, originalName)) {
			vscode.window.showErrorMessage(`'${originalName}' is not a code symbol.`);
			return;
		}
		const scope = await showScopePick();
		if (scope === undefined)
			return;
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
				let update: boolean;
				if (scope)
					update = await configuration.updateGlobalRenaming(originalName, renamingConfiguration);
				else
					update = await configuration.updateLocalRenaming(editor.document.uri, originalName, renamingConfiguration);
				if (update) {
					refreshRenamings();
					vscode.window.showInformationMessage(`'${originalName}' successfully renamed to '${newName}'.`);
				}
			}
		}
	});
	vscode.commands.registerCommand("adverb.renameAll", async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || !SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;

		const scope = await showScopePick();
		if (scope === undefined)
			return;
		const renamingTypes = getRenamingTypes();
		const items: string[] = renamingTypes.filter(x => x.onlyForSingleRenaming === false).map(x => x.description);
		const result = await showQuickPick(`Choose a renaming technique for all symbols:`, items);
		const renamingType = renamingTypes.find(x => x.description === result);
		if (renamingType) {
			let update: boolean;
			if (scope)
				update = await configuration.updateGlobalFileRenaming(renamingType);
			else
				update = await configuration.updateLocalFileRenaming(editor.document.uri, renamingType);
			if (update) {
				refreshRenamings();
				vscode.window.showInformationMessage(`All symbols successfully renamed.`);
			}
		}
	});
	vscode.commands.registerCommand("adverb.fold", async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || !SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;

		const result = await addFolding(editor);
		if (result)
			vscode.window.showInformationMessage(`Folding [${result.start + 1}-${result.end + 1}] successfully added.`);
		refreshFoldings();
	});

	// TREEVIEW
	// RENAMINGS
	vscode.window.registerTreeDataProvider("adverb.globalRenamings", globalTreeViewProvider);
	vscode.window.registerTreeDataProvider("adverb.localRenamings", localTreeViewProvider);
	vscode.commands.registerCommand("adverb.globalRefreshRenamings", () => {
		globalTreeViewProvider.refresh();
	});
	vscode.commands.registerCommand("adverb.localRefreshRenamings", () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;

		refreshRenamings();
	});
	vscode.commands.registerCommand("adverb.globalEditRenaming", async (node: RenamingTreeItem) => {
		const value = await configuration.getGlobalRenaming(node.originalName);
		if (value) {
			const newName = await showInputDialog(node.originalName);
			if (newName) {
				value.newName = newName;
				const update = await configuration.updateGlobalRenaming(node.originalName, value);
				if (update) {
					refreshRenamings();
					vscode.window.showInformationMessage(`'${value.originalName}' successfully updated to '${newName}'.`);
				}
			}
		}
	});
	vscode.commands.registerCommand("adverb.localEditRenaming", async (node: RenamingTreeItem) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;
		if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;

		const value = await configuration.getRenaming(editor.document.uri, node.originalName);
		if (value) {
			const newName = await showInputDialog(node.originalName);
			if (newName) {
				value.newName = newName;
				const update = await configuration.updateLocalRenaming(editor.document.uri, node.originalName, value);
				if (update) {
					refreshRenamings();
					vscode.window.showInformationMessage(`'${value.originalName}' successfully updated to '${newName}'.`);
				}
			}
		}
	});
	vscode.commands.registerCommand("adverb.globalDeleteRenaming", async (node: RenamingTreeItem) => {
		if (node.originalName === "all symbol names") {
			const result = await configuration.updateGlobalFileRenaming(undefined);
			if (result)
				vscode.window.showInformationMessage(`Renaming of all symbols removed.`);
		} else {
			const value = await configuration.getGlobalRenaming(node.originalName);
			if (value) {
				const result = await configuration.removeGlobalRenaming(value);
				if (result)
					vscode.window.showInformationMessage(`Renaming ('${value.originalName}' -> '${value.newName}') successfully removed.`);
			}
		}

		refreshRenamings();
	});
	vscode.commands.registerCommand("adverb.localDeleteRenaming", async (node: RenamingTreeItem) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;

		await deleteLocalRenaming(editor, node.originalName);

		refreshRenamings();
	});
	vscode.commands.registerCommand("adverb.localActuallyRename", async (node: RenamingTreeItem) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;
		if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;

		vscode.window.showInformationMessage("Do you really want to rename the code symbol in the selected way?", ...["Yes", "No"])
			.then(async (answer) => {
				if (answer === "Yes") {
					if (node.originalName === "all symbol names") {
						vscode.window.showErrorMessage("Unfortunately, all symbol names cannot be renamed.");
						return;
					}

					let position = ast.getSymbolPosition(editor, node.originalName);
					if (position) {
						while (position) {
							await vscode.commands.executeCommand<vscode.WorkspaceEdit>("vscode.executeDocumentRenameProvider", editor.document.uri, position, node.newName).then(async (edit) => {
								if (edit?.size && edit.size > 0)
									await vscode.workspace.applyEdit(edit);
							});
							position = ast.getSymbolPosition(editor, node.originalName);
						}
						await deleteLocalRenaming(editor, node.originalName);
						refreshRenamings();
					}
				}
			});
	});

	// TREEVIEW
	// FOLDINGS
	vscode.window.registerTreeDataProvider("adverb.foldings", foldingTreeViewProvider);
	vscode.commands.registerCommand("adverb.refreshFoldings", () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;

		refreshFoldings();
	});
	vscode.commands.registerCommand("adverb.expandAllFoldings", async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;
		if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;
		const foldings = await configuration.getFoldings(editor.document.uri);
		if (foldings)
			await vscode.commands.executeCommand("editor.unfold", { levels: 1, selectionLines: Object.keys(foldings).map(x => foldings[x].start) });
	});
	vscode.commands.registerCommand("adverb.collapseAllFoldings", async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;
		if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;
		const foldings = await configuration.getFoldings(editor.document.uri);
		if (foldings)
			await vscode.commands.executeCommand("editor.fold", { levels: 1, selectionLines: Object.keys(foldings).map(x => foldings[x].start) });
	});
	vscode.commands.registerCommand("adverb.editFolding", async (node: FoldingTreeItem) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;
		if (!SUPPORTED_LANGUAGES.includes(editor.document.languageId))
			return;

		const value = await configuration.getFolding(editor.document.uri, node.start, node.end);
		if (value) {
			const result = await addFolding(editor, node.start + 1, node.end + 1);
			if (result) {
				await configuration.removeFolding(editor.document.uri, node);
				vscode.window.showInformationMessage(`Folding [${result.start + 1}-${result.end + 1}] successfully updated.`);
			}
			refreshFoldings();
		}
	});
	vscode.commands.registerCommand("adverb.deleteFolding", async (node: FoldingTreeItem) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;

		const result = await configuration.removeFolding(editor.document.uri, node);
		if (result) {
			vscode.window.showInformationMessage(`Folding [${node.start + 1}-${node.end + 1}] successfully removed.`);
			refreshFoldings();
		}
	});

	refreshRenamings();
	refreshFoldings();
}

export function deactivate() { }
