import axios from "axios";
import { resolve } from "path/posix";
import { commands, ProgressLocation, TextEditor, window } from "vscode";
import configuration from "../configuration";
import { FoldingConfiguration } from "../models";
import { Settings } from "../settings";
import { refreshFoldings, updateEditorFoldingRanges } from "../utils";
import { Command, Commands } from "./command";

export class FoldCommand extends Command {
  constructor() {
    super(Commands.Fold);
  }

  async execute(editor: TextEditor, ...args: any[]) {
    let initialMin = args && args.length === 2 ? (args[0] as number) : undefined;
    let initialMax = args && args.length === 2 ? (args[1] as number) : undefined;

    let min = 1;
    let max = editor.document.lineCount;
    const startInput = await window.showInputBox({
      title: `Enter the starting line number:`, value: (initialMin ?? min).toString(),
      validateInput: (value: string) => {
        if (isNaN(parseInt(value))) return "Please enter a valid line number.";
        if (parseInt(value) < min! || parseInt(value) > max! - 1)
          return "Please choose a valid line number.";
        return undefined;
      },
    });
    if (!startInput) return;
    const start = parseInt(startInput) - 1;
    const endInput = await window.showInputBox({
      title: `Enter the ending line number:`, value: (initialMax ?? start + 2).toString(),
      validateInput: (value: string) => {
        if (isNaN(parseInt(value))) return "Please enter a valid line number.";
        if (parseInt(value) < start + 2 || parseInt(value) > max!)
          return "Please choose a valid line number.";
        return undefined;
      },
    });
    if (!endInput) return;
    const end = parseInt(endInput) - 1;
    window.withProgress({
      location: ProgressLocation.Notification,
      title: "Getting folding summary...",
      cancellable: false
    }, async () => {
      let content: string = "";
      for (let i = start; i <= end; i++) {
        content += editor.document.lineAt(i).text + "\n";
      }
      await axios
        .post(Settings.getSummaryApiUrl(), {
          content: content,
        })
        .then(async (response: any) => {
          const message = response.data["result"];
          if (!message) return;
          const foldingConfiguration = new FoldingConfiguration(start, end, message);
          const foldings = await configuration.getFoldings(editor.document.uri);
          if (foldings) {
            const equalFoldings = Object.values(foldings).filter((f) => f.start === start);
            for (const f of equalFoldings)
              await configuration.removeFolding(editor.document.uri, f);
          }
          await configuration.updateFolding(editor.document.uri, foldingConfiguration);
          await updateEditorFoldingRanges(editor);
          await commands.executeCommand("editor.fold", { levels: 1, selectionLines: [start], });
          if (foldingConfiguration)
            window.showInformationMessage(`Folding [${foldingConfiguration.start + 1}-${foldingConfiguration.end + 1} successfully added.`);
          refreshFoldings();
        })
        .catch((error: any) => {
          window.showErrorMessage("API request for code summary failed.");
        });
      return new Promise<void>(resolve => resolve());
    });
  }
}
