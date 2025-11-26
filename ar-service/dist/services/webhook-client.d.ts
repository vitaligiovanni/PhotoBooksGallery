export declare class WebhookClient {
    /**
     * Send webhook to main backend
     */
    send(event: string, data: Record<string, any>): Promise<boolean>;
    /**
     * Notify backend that AR compilation completed
     */
    notifyCompilationComplete(projectId: string, viewUrl: string, qrCodeUrl: string): Promise<boolean>;
    /**
     * Notify backend that AR compilation failed
     */
    notifyCompilationFailed(projectId: string, errorMessage: string): Promise<boolean>;
    /**
     * Request email notification from backend
     */
    requestEmailNotification(projectId: string, userId: string, viewUrl: string): Promise<boolean>;
}
export declare const webhookClient: WebhookClient;
//# sourceMappingURL=webhook-client.d.ts.map