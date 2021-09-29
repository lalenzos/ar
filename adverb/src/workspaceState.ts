import * as vscode from "vscode";
import { StateObject } from "./models";

let _context: vscode.ExtensionContext;

const initialize = (context: vscode.ExtensionContext) => {
    _context = context;
}

const getKey = (uri: vscode.Uri): string => {
    return uri.toString();
}

const getValues = (uri: vscode.Uri): { [key: string]: StateObject } | undefined => {
    const key = getKey(uri);
    return _context.workspaceState.get<{ [key: string]: StateObject }>(key);
}

const updateValue = async (uri: vscode.Uri, stateObject: StateObject): Promise<boolean> => {
    if (!_context)
        return false;

    const key = getKey(uri);
    if (_context.workspaceState.keys().includes(key)) {
        const values = _context.workspaceState.get<{ [key: string]: StateObject }>(key)!;
        values[stateObject.originalName] = stateObject;
        await _context.workspaceState.update(key, values);
    } else
        await _context.workspaceState.update(key, { [stateObject.originalName]: stateObject });

    return true;
}

const removeValue = async (uri: vscode.Uri, stateObject: StateObject): Promise<boolean> => {
    const key = getKey(uri);
    if (!_context.workspaceState.keys().includes(key))
        return false;

    const values = _context.workspaceState.get<{ [key: string]: StateObject }>(key)!;
    if(Object.keys(values).includes(stateObject.originalName))
        delete values[stateObject.originalName];
    await _context.workspaceState.update(key, values);
    return true;
}

export default { initialize, getValues, updateValue, removeValue };