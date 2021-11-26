import { TextEditor, window } from "vscode";
import ast from "../ast";
import configuration from "../configuration";
import { getRenamingTypes, RenamingConfiguration } from "../models";
import { showScopePick, showQuickPick, showInputDialog, refreshRenamings } from "../utils";
import { Command, Commands } from "./command";

export class RenameSingleCommand extends Command {
  constructor() {
    super(Commands.RenameSingle);
  }

  async execute(editor: TextEditor, ...args: any[]) {
    const cursorPosition = editor.selection.start;
    const wordRange = editor.document.getWordRangeAtPosition(cursorPosition);
    if (!wordRange) {
      window.showErrorMessage("No symbol to rename found.");
      return;
    }
    const originalName = editor.document.getText(wordRange);
    if (!originalName) {
      window.showErrorMessage("No symbol to rename found.");
      return;
    }
    if (!ast.checkIfNameIsACodeSymbol(editor, originalName)) {
      window.showErrorMessage(`'${originalName}' is not a code symbol.`);
      return;
    }
    const scope = await showScopePick();
    if (scope === undefined) return;
    const renamingTypes = getRenamingTypes();
    const items: string[] = renamingTypes.map((x) => x.description);
    const result = await showQuickPick(`Choose a new name or a renaming technique for '${originalName}':`, items);
    const renamingType = renamingTypes.find((x) => x.description === result);
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
          window.showInformationMessage(`'${originalName}' successfully renamed to '${newName}'.`);
        }
      }
    }
  }
}
