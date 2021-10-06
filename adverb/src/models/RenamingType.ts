export class RenamingType {
    constructor(
        public id: number,
        public description: string,
        public onlyForSingleRenaming: boolean,
        public getNewNameFunction: ((originalName: string) => string | undefined) | undefined
    ) { }
}

export const getRenamingTypes = (): RenamingType[] => [
    {
        id: 1,
        description: "Enter new name",
        onlyForSingleRenaming: true,
        getNewNameFunction: undefined
    },
    {
        id: 2,
        description: "Remove vowels",
        onlyForSingleRenaming: false,
        getNewNameFunction: (originalName: string) => originalName.replace(/[aeiou]/gi, "")
    },
    {
        id: 3,
        description: "Keep only [1° letter], [upper-case letters] and [special characters + 1° letter]",
        onlyForSingleRenaming: false,
        getNewNameFunction: (originalName: string) => originalName.match(/((^.)|[0-9A-Z]|(\$\w)|(_\w))+/g)?.join("")
    },
    {
        id: 4,
        description: "Change to camelCase",
        onlyForSingleRenaming: false,
        getNewNameFunction: (originalName: string) => originalName
            .replace(/\s(.)/g, function ($1) { return $1.toUpperCase(); })
            .replace(/\s/g, '')
            .replace(/^(.)/, function ($1) { return $1.toLowerCase(); })
    },
    {
        id: 5,
        description: "Change to PascalCase",
        onlyForSingleRenaming: false,
        getNewNameFunction: (originalName: string) => originalName
            .replace(/(\w)(\w*)/g, function (g0, g1, g2) { return g1.toUpperCase() + g2.toLowerCase(); })
    },
    {
        id: 6,
        description: "Change to snake_case",
        onlyForSingleRenaming: false,
        getNewNameFunction: (originalName: string) => originalName
            .replace(/\W+/g, " ").split(/ |\B(?=[A-Z])/).map(word => word.toLowerCase()).join('_')
    },
    // {
    //     id: 6,
    //     description: "Change to kebab-case",
    //     getNewNameFunction: (originalName: string) => originalName
    //         .replace(/\W+/g, " ").split(/ |\B(?=[A-Z])/).map(word => word.toLowerCase()).join('-')
    // },
    {
        id: 7,
        description: "Change to UPPERCASE",
        onlyForSingleRenaming: false,
        getNewNameFunction: (originalName: string) => originalName?.toUpperCase()
    },
    {
        id: 8,
        description: "Change to lowercase",
        onlyForSingleRenaming: false,
        getNewNameFunction: (originalName: string) => originalName?.toLowerCase()
    }
];