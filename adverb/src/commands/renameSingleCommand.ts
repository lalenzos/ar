import { QuickPickItem, QuickPickItemKind, TextEditor, window } from "vscode";
import ast from "../ast";
import configuration from "../configuration";
import { getRenamingTypes, RenamingConfiguration } from "../models";
import { showScopePick, showQuickPick, showInputDialog, refreshRenamings, getCodeForRange } from "../utils";
import { Command, Commands, MultiStepInput } from ".";

interface State {
  scope: QuickPickItem;
  renamingTechnique: QuickPickItem;
  name: string;
}

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

    const isFunction = ast.getRangeOfFunctionSymbol(editor, originalName);
    const renamingTypes = isFunction ? getRenamingTypes() : getRenamingTypes().filter(x => x.onlyForFunctionNames === false);
    const code = isFunction ? getCodeForRange(editor.document, isFunction) : undefined;

    const newNames: { [key: string]: string } = {};
    async function createNewNames() {
      for (const x of renamingTypes) {
        if (x.getNewNameFunction)
          newNames[x.description] = await x.getNewNameFunction(originalName, code) ?? "";
      }
    };
    createNewNames();

    const title = "Rename code symbol";
    const state = {} as Partial<State>;
    await MultiStepInput.run(input => pickScope(input, state)).catch(console.error);;
    async function pickScope(input: MultiStepInput, state: Partial<State>) {
      const pick = await input.showQuickPick({
        title,
        step: 1,
        totalSteps: 3,
        placeholder: "Choose the scope of your renaming",
        items: ["Local (current file)", "Global (whole workspace)"].map(label => ({ label })),
        activeItem: state.scope,
        shouldResume: shouldResume
      });
      state.scope = pick;
      return (input: MultiStepInput) => pickRenamingTechnique(input, state);
    };
    async function pickRenamingTechnique(input: MultiStepInput, state: Partial<State>) {
      const pick = await input.showQuickPick({
        title,
        step: 2,
        totalSteps: 3,
        placeholder: "Choose a renaming technique",
        items: renamingTypes.map(x => ({ label: x.description, detail: (newNames[x.description] ?? "") })),
        activeItem: state.renamingTechnique,
        shouldResume: shouldResume
      });
      state.renamingTechnique = pick;
      return (input: MultiStepInput) => inputName(input, state);
    };
    async function inputName(input: MultiStepInput, state: Partial<State>) {
      // if(!newNames[state.renamingTechnique!.label]){
      //   const technique = renamingTypes.find(x => x.description === state.renamingTechnique!.label);
      //   if(technique?.getNewNameFunction)
      //   vscode.window.withProgress({
      //     location: vscode.ProgressLocation.Notification,
      //   }, async (progress) => {
      //     while(!newNames[state.renamingTechnique!.label])

      //   }});
      //   }
      state.name = await input.showInputBox({
        title,
        step: 3,
        totalSteps: 3,
        value: state.name || (newNames[state.renamingTechnique!.label] ?? ""),
        prompt: "Choose the new symbol name for '" + originalName + "'",
        validate: async (name) => name === originalName ? "Please choose a different name." : undefined,
        shouldResume: shouldResume
      });
    }

    function shouldResume() {
      // Could show a notification with the option to resume.
      return new Promise<boolean>((resolve, reject) => {
      });
    }

    if (!state.name)
      return;

    const newName = state.name;
    const scope = state.scope;
    const renamingType = state.renamingTechnique!;

    if (newName && newName !== originalName) {
      const renamingConfiguration: RenamingConfiguration = new RenamingConfiguration(originalName, newName, 1); //renamingType.id
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

    // const scope = await showScopePick();
    // if (scope === undefined) return;
    // const isFunction = ast.getRangeOfFunctionSymbol(editor, originalName);

    // const items: string[] = (isFunction ? renamingTypes : renamingTypes.filter(x => x.onlyForFunctionNames === false)).map((x) => x.description);
    // const result = await showQuickPick(`Choose a new name or a renaming technique for '${originalName}':`, items);
    // const renamingType = renamingTypes.find((x) => x.description === result);
    // if (renamingType) {
    //   let newName: string | undefined;
    //   if (renamingType.getNewNameFunction) {
    //     const code = isFunction ? getCodeForRange(editor.document, isFunction) : undefined;
    //     newName = await renamingType.getNewNameFunction(originalName, code);
    //   } else
    //     newName = await showInputDialog(originalName);
    //   if (newName && newName !== originalName) {
    //     const renamingConfiguration: RenamingConfiguration = new RenamingConfiguration(originalName, newName, renamingType.id);
    //     let update: boolean;
    //     if (scope)
    //       update = await configuration.updateGlobalRenaming(originalName, renamingConfiguration);
    //     else
    //       update = await configuration.updateLocalRenaming(editor.document.uri, originalName, renamingConfiguration);
    //     if (update) {
    //       refreshRenamings();
    //       window.showInformationMessage(`'${originalName}' successfully renamed to '${newName}'.`);
    //     }
    //   }
    // }
  }
}
