import { RenamingType } from ".";

export class StateObject {
    constructor(public originalName: string, public newName: string, public type: RenamingType) { }
}