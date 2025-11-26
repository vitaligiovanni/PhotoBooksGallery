import PgBoss from 'pg-boss';
export declare const boss: PgBoss;
export declare const QUEUE_NAMES: {
    readonly AR_COMPILE: "ar-compile";
    readonly DEMO_CLEANUP: "demo-cleanup";
    readonly WEBHOOK_NOTIFY: "webhook-notify";
};
export declare function initializeQueue(): Promise<void>;
export declare function startQueue(): Promise<void>;
export declare function stopQueue(): Promise<void>;
//# sourceMappingURL=queue.d.ts.map