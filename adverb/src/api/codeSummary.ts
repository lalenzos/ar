import axios from "axios";
import { window, ProgressLocation } from "vscode";
import { Settings } from "../settings";

export const getCodeSummary = async (code: string, showProgress: boolean = false): Promise<string | undefined> => {
    return showProgress ?
        window.withProgress({
            location: ProgressLocation.Notification,
            title: "Getting folding summary...",
            cancellable: false
        }, async () => {
            return new Promise<string | undefined>(resolve => resolve(_getCodeSummary(code)));
        })
        :
        _getCodeSummary(code);
};

const _getCodeSummary = async (code: string): Promise<string | undefined> => {
    const result = await axios
        .post(Settings.getSummaryApiUrl(), {
            content: code,
        })
        .then((response: any) => {
            return response.data["result"];
        })
        .catch((error: any) => {
            window.showErrorMessage("API request for code summary failed.");
            return undefined;
        });
    return result;
};