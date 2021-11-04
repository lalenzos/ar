import { FoldingConfiguration } from ".";
import { GlobalConfiguration } from "./GlobalConfiguration";

export class FileConfiguration extends GlobalConfiguration {
    public foldings: { [key: string]: FoldingConfiguration } | undefined;
};