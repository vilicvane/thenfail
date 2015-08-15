export interface Domain {
    active: Domain;
}
export interface Task {
    (): void;
}
export interface RawTask {
    task: Task;
    domain: Domain;
}
export interface RequestFlush {
    (): void;
}
export interface ASAP {
    (task: Task): void;
    onerror: (error: any) => void;
}
export interface RawASAP {
    (task: RawTask): void;
    requestFlush: RequestFlush;
    makeRequestCallFromTimer: (callback: any) => () => void;
}
export declare var asap: ASAP;
