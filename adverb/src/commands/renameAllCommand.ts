import { TextEditor, window } from "vscode";
import configuration from "../configuration";
import { getRenamingTypes } from "../models";
import { refreshRenamings, showQuickPick, showScopePick } from "../utils";
import { Command, Commands } from "./command";

export class RenameAllCommand extends Command {
  constructor() {
    super(Commands.RenameAll);
  }

  async execute(editor: TextEditor, ...args: any[]) {
    const scope = await showScopePick();
    if (scope === undefined) return;
    const renamingTypes = getRenamingTypes();
    const items: string[] = renamingTypes.filter((x) => x.onlyForSingleRenaming === false).map((x) => x.description);
    const result = await showQuickPick(`Choose a renaming technique for all symbols:`, items);
    const renamingType = renamingTypes.find((x) => x.description === result);
    if (renamingType) {
      let update: boolean;
      if (scope)
        update = await configuration.updateGlobalFileRenaming(renamingType);
      else
        update = await configuration.updateLocalFileRenaming(editor.document.uri, renamingType);
      if (update) {
        refreshRenamings();
        window.showInformationMessage(`All symbols successfully renamed.`);
      }
    }
  }
}
