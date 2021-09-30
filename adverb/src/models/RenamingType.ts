import * as vscode from "vscode";

export class RenamingType {
    constructor(public id: number, public description: string, public getNewNameFunction: () => (originalName: string) => Promise<string | undefined>) { }
}

export const getRenamingTypes = (): RenamingType[] => [
    {
        id: 1,
        description: "Enter new name",
        getNewNameFunction: () => async (originalName: string) => {
            const newName = await vscode.window.showInputBox({
                title: `Enter a new name for '${originalName}':`,
                value: originalName,
                validateInput: (value) => value === originalName ? "Please choose a new name." : undefined
            })
            return newName;
        }
    },
    {
        id: 2,
        description: "Remove vowels",
        getNewNameFunction: () => async (originalName: string) => { return originalName?.replace(/[aeiou]/gi, ""); }
    },
    {
        id: 3,
        description: "Change to camelCase",
        getNewNameFunction: () => async (originalName: string) => originalName
            .replace(/\s(.)/g, function ($1) { return $1.toUpperCase(); })
            .replace(/\s/g, '')
            .replace(/^(.)/, function ($1) { return $1.toLowerCase(); })
    },
    {
        id: 4,
        description: "Change to PascalCase",
        getNewNameFunction: () => async (originalName: string) => originalName
            .replace(/(\w)(\w*)/g, function (g0, g1, g2) { return g1.toUpperCase() + g2.toLowerCase(); })
    },
    {
        id: 5,
        description: "Change to snake_case",
        getNewNameFunction: () => async (originalName: string) => originalName
            .replace(/\W+/g, " ").split(/ |\B(?=[A-Z])/).map(word => word.toLowerCase()).join('_')
    },
    {
        id: 6,
        description: "Change to kebab-case",
        getNewNameFunction: () => async (originalName: string) => originalName
            .replace(/\W+/g, " ").split(/ |\B(?=[A-Z])/).map(word => word.toLowerCase()).join('-')
    },
    {
        id: 7,
        description: "Change to UPPERCASE",
        getNewNameFunction: () => async (originalName: string) => originalName?.toUpperCase()
    },
    {
        id: 8,
        description: "Change to lowercase",
        getNewNameFunction: () => async (originalName: string) => originalName?.toLowerCase()
    }
];