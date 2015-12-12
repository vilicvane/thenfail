/**
 * BaseError class.
 */
export class BaseError extends Error {
    name = (this.constructor as any).name;
    stack: string;
    
    constructor(
        public message: string
    ) {
        super(message);
        
        this.stack = (new Error() as any)
            .stack
            .replace(/\s+at new BaseError .+/, '');
    }
}

/**
 * TimeoutError class.
 */
export class TimeoutError extends BaseError { }
