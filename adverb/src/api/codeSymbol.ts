import axios from "axios";
import { window, ProgressLocation } from "vscode";
import { Settings } from "../settings";

export const getSymbolName = async (symbolName: string, code: string, showProgress: boolean = false): Promise<string | undefined> => {
    code = code.replace(symbolName, "<extra_id_0>");
    return showProgress ?
        window.withProgress({
            location: ProgressLocation.Notification,
            title: "Getting symbol name...",
            cancellable: false
        }, async () => {
            return new Promise<string | undefined>(resolve => resolve(_getSymbolName(code)));
        })
        :
        _getSymbolName(code);
};

const _getSymbolName = async (code: string): Promise<string | undefined> => {
    const result = await axios
        .post(Settings.getNameApiUrl(), {
            content: code,
        })
        .then((response: any) => {
            return response.data["result"];
        })
        .catch((error: any) => {
            console.error(error);
            window.showErrorMessage("API request for code name failed.");
            return undefined;
        });
    return result;
};