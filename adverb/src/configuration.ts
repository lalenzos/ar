import { workspace, Uri } from "vscode";
import { TextDecoder, TextEncoder } from "util";
import { SourceCodeFileConfiguration, RenamingType, RenamingConfiguration } from "./models";

const DIRECTORY = ".vscode";
const FILENAME = "adverb.config.json";
const PATH = `${DIRECTORY}/${FILENAME}`;

const _getUri = () => {
    const folders = workspace.workspaceFolders;
    if (!folders || folders.length === 0)
        return undefined;
    const result = Uri.joinPath(folders[0].uri, PATH);
    return result;
}

const _getData = async (): Promise<{ [key: string]: SourceCodeFileConfiguration } | undefined> => {
    try {
        const uri = _getUri();
        if (!uri)
            return undefined;
        const data = await workspace.fs.readFile(uri);
        const json = new TextDecoder().decode(data);
        return JSON.parse(json) as { [key: string]: SourceCodeFileConfiguration };
    } catch (err) {
        console.log(err);
        return undefined;
    }
}

const _getKey = (uri: Uri): string => {
    return uri.toString();
}

const getRenamingConfiguration = async (uri: Uri, key: string): Promise<RenamingConfiguration | undefined> => {
    const config = await getSourceCodeFileConfiguration(uri);
    if (!config || !config.singleRenamingConfigurations)
        return undefined;
    return config.singleRenamingConfigurations[key];
}

const getSourceCodeFileConfiguration = async (uri: Uri): Promise<SourceCodeFileConfiguration | undefined> => {
    const data = await _getData();
    if (!data)
        return undefined;

    const key = _getKey(uri);
    return data[key];
}

const updateRenamingConfiguration = async (uri: Uri, key: string, renamingConfiguration: RenamingConfiguration): Promise<boolean> => {
    try {
        const settingsUri = _getUri();
        if (!settingsUri)
            return false;
        let data: { [key: string]: SourceCodeFileConfiguration } | undefined = await _getData();
        const fileKey = _getKey(uri);
        if (data) {
            if (data[fileKey]) {
                if (data[fileKey].singleRenamingConfigurations) {
                    if (data[fileKey].singleRenamingConfigurations![key])
                        data[fileKey].singleRenamingConfigurations![key] = renamingConfiguration;
                    else
                        data[fileKey].singleRenamingConfigurations = { ...data[fileKey].singleRenamingConfigurations, [key]: renamingConfiguration };
                } else {
                    data[fileKey].singleRenamingConfigurations = { [key]: renamingConfiguration };
                }
            } else {
                data = { ...data, [fileKey]: new SourceCodeFileConfiguration(undefined, { [key]: renamingConfiguration }) };
            }
        } else {
            data = { [fileKey]: new SourceCodeFileConfiguration(undefined, { [key]: renamingConfiguration }) };
        }
        const json = JSON.stringify(data);
        const uint8array = new TextEncoder().encode(json);
        await workspace.fs.writeFile(settingsUri, uint8array);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

const updateSourceCodeFileConfigurationsRenaming = async (uri: Uri, renamingType?: RenamingType): Promise<boolean> => {
    try {
        const settingsUri = _getUri();
        if (!settingsUri)
            return false;
        let data: { [key: string]: SourceCodeFileConfiguration } | undefined = await _getData();
        const key = _getKey(uri);
        if (data) {
            if (data[key])
                data[key].fileRenamingTypeId = renamingType?.id;
            else
                data[key] = new SourceCodeFileConfiguration(renamingType?.id, undefined);
        } else {
            data = { [key]: new SourceCodeFileConfiguration(renamingType?.id, undefined) };
        }
        const json = JSON.stringify(data);
        const uint8array = new TextEncoder().encode(json);
        await workspace.fs.writeFile(settingsUri, uint8array);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

const removeRenamingConfiguration = async (uri: Uri, renamingConfiguration: RenamingConfiguration): Promise<boolean> => {
    try {
        const settingsUri = _getUri();
        if (!settingsUri)
            return false;
        let data: { [key: string]: SourceCodeFileConfiguration } | undefined = await _getData();
        const key = _getKey(uri);
        if (data && data[key] && data[key].singleRenamingConfigurations && data[key].singleRenamingConfigurations![renamingConfiguration.originalName]) {
            delete data[key].singleRenamingConfigurations![renamingConfiguration.originalName];
            if ((!data[key].singleRenamingConfigurations || Object.keys(data[key].singleRenamingConfigurations!).length === 0) && !data[key].fileRenamingTypeId)
                delete data[key];
            const json = JSON.stringify(data);
            const uint8array = new TextEncoder().encode(json);
            await workspace.fs.writeFile(settingsUri, uint8array);
            return true;
        }
    } catch (err) {
        console.log(err);
    }
    return false;
}

export default { getRenamingConfiguration, getSourceCodeFileConfiguration, updateRenamingConfiguration, updateSourceCodeFileConfigurationsRenaming, removeRenamingConfiguration };