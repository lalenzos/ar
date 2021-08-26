# refactoring README

This demo extension appends to each variable name the prefix "ADVERB_" when opening a `*.js` file. The transformation or reset is carried out on subsequent events:

- `vscode.workspace.onDidOpenTextDocument` (appending...)
- `vscode.workspace.onDidSaveTextDocument` (appending...)
- `vscode.workspace.onWillSaveTextDocument` (resetting...)


## Running the sample

- `npm install`
- open the file `src/extension.ts`, press `F5` to run the extension
- open the example js-file from the folder `example`
- the extension gets automatically executed when opening a `*.js` file