import * as vscode from 'vscode'

export default class Commands {
    public static registerCommands() {
        vscode.commands.registerCommand('decorator-renaming.toggle', () => {
            const currentState = vscode.workspace.getConfiguration('decorator-renaming').get('enabled')

            vscode.workspace.getConfiguration('decorator-renaming').update('enabled', !currentState, true)
        })
    }
}
