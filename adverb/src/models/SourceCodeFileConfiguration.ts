import { RenamingConfiguration } from ".";

export class SourceCodeFileConfiguration {
    public constructor(
        public fileRenamingTypeId: number | undefined,
        public singleRenamingConfigurations: { [key: string]: RenamingConfiguration } | undefined
    ) { }
}