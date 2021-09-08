import {
    DecorationInstanceRenderOptions,
    ThemeColor,
    DecorationOptions,
    Range,
    workspace,
} from "vscode"

export class Annotations {
    public static parameterAnnotation(
        message: string,
        range: Range
    ): DecorationOptions {
        return {
            range,
            renderOptions: {
                before: {
                    contentText: message,
                    color: new ThemeColor("inlineparameters.annotationForeground"),
                    backgroundColor: new ThemeColor("inlineparameters.annotationBackground"),
                    fontStyle: workspace.getConfiguration("decorator").get("fontStyle"),
                    fontWeight: workspace.getConfiguration("decorator").get("fontWeight"),
                    textDecoration: `;
                        font-size: ${workspace.getConfiguration("decorator").get("fontSize")};
                        margin: ${workspace.getConfiguration("decorator").get("margin")};
                        padding: ${workspace.getConfiguration("decorator").get("padding")};
                        border-radius: ${workspace.getConfiguration("decorator").get("borderRadius")};
                        border: ${workspace.getConfiguration("decorator").get("border")};
                        vertical-align: middle;
                    `,
                },
            } as DecorationInstanceRenderOptions,
        } as DecorationOptions
    }
}
