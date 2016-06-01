export class BreakSignal {
    constructor(
        public preliminary = false
    ) { }
}

export class GoToSignal {
    constructor(
        public label: string,
        public value: any,
        public preliminary = false
    ) { }
}
