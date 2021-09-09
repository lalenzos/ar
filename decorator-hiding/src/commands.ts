import * as vscode from 'vscode'

export default class Commands {
    public static registerCommands() {
        vscode.commands.registerCommand('decorator-hiding.toggle', () => {
            const currentState = vscode.workspace.getConfiguration('decorator-hiding').get('enabled')

            vscode.workspace.getConfiguration('decorator-hiding').update('enabled', !currentState, true)
        })
    }
}
