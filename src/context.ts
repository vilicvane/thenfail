export class Context {
    _disposed = false;
    _enclosed = false;

    _subContexts: Context[];

    /**
     * (get) A boolean that indicates whether this promise context is disposed.
     * See https://github.com/vilic/thenfail# for more information.
     */
    get disposed(): boolean {
        return this._disposed;
    }

    /**
     * (get) A boolean that indicates whether this promise context is enclosed.
     * See https://github.com/vilic/thenfail# for more information.
     */
    get enclosed(): boolean {
        return this._enclosed;
    }

    /**
     * Dispose this promise context.
     * See https://github.com/vilic/thenfail# for more information.
     */
    dispose(): void {
        this._disposed = true;
        this.disposeSubContexts();
    }

    /**
     * Dispose all sub contexts of this promise context.
     */
    disposeSubContexts(): void {
        if (this._subContexts) {
            for (let context of this._subContexts) {
                context.dispose();
            }

            this._subContexts = undefined;
        }
    }
}
