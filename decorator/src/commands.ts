import * as vscode from 'vscode'

export default class Commands {
    public static registerCommands() {
        vscode.commands.registerCommand('decorator.toggle', () => {
            const currentState = vscode.workspace.getConfiguration('decorator').get('enabled')

            vscode.workspace.getConfiguration('decorator').update('enabled', !currentState, true)
        })
    }
}
