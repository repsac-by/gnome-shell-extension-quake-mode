// TODO: contribute these types to @girs

interface ImportMeta {
  url: string;
}

declare const global: any;

type MethodNames<T extends object> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

declare module "resource:///org/gnome/shell/extensions/extension.js" {
  type CreateOverrideFunc<
    O extends object,
    F extends (...args: any[]) => any,
  > = (originalMethod: F) => (this: O, ...args: Parameters<F>) => ReturnType<F>;

  export class InjectionManager {
    /**
     * Modify, replace or inject a method
     *
     * @param prototype - the object (or prototype) that is modified
     * @param methodName - the name of the overwritten method
     * @param createOverrideFunc - function to call to create the override
     */
    overrideMethod<P extends object, MN extends MethodNames<P>>(
      prototype: P,
      methodName: MN,
      // @ts-expect-error It works
      createOverrideFunc: CreateOverrideFunc<P, P[MN]>,
    ): void;

    /**
     * Restore the original method
     *
     * @param prototype - the object (or prototype) that is modified
     * @param methodName - the name of the method to restore
     */
    restoreMethod(prototype: object, methodName: string): void;

    /**
     * Restore all original methods and clear overrides
     */
    clear(): void;

    _saveMethod(prototype: object, methodName: string): void;

    _installMethod(
      prototype: object,
      methodName: string,
      method: Function,
    ): void;
  }
}

declare module "resource:///org/gnome/shell/ui/workspace.js" {
  import type Meta from "gi://Meta";
  export class Workspace {
    _isOverviewWindow(window: Meta.Window): boolean;
  }
}
