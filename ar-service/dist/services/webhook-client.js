"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookClient = exports.WebhookClient = void 0;
const axios_1 = __importDefault(require("axios"));
// Webhook client for notifying main backend
// AR-service → Backend communication
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:5002';
const WEBHOOK_SECRET = process.env.BACKEND_WEBHOOK_SECRET || '';
class WebhookClient {
    /**
     * Send webhook to main backend
     */
    async send(event, data) {
        const payload = {
            event,
            data,
            timestamp: new Date().toISOString()
        };
        console.log(`[Webhook] 📤 Sending: ${event}`, data);
        try {
            const response = await axios_1.default.post(`${BACKEND_URL}/webhooks/ar-service`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Secret': WEBHOOK_SECRET
                },
                timeout: 10000 // 10 second timeout
            });
            console.log(`[Webhook] ✅ Success: ${event}`, response.status);
            return true;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                console.error(`[Webhook] ❌ Failed: ${event}`, {
                    status: axiosError.response?.status,
                    message: axiosError.message
                });
            }
            else {
                console.error(`[Webhook] ❌ Failed: ${event}`, error);
            }
            return false;
        }
    }
    /**
     * Notify backend that AR compilation completed
     */
    async notifyCompilationComplete(projectId, viewUrl, qrCodeUrl) {
        return this.send('ar.compilation.complete', {
            projectId,
            viewUrl,
            qrCodeUrl,
            status: 'ready'
        });
    }
    /**
     * Notify backend that AR compilation failed
     */
    async notifyCompilationFailed(projectId, errorMessage) {
        return this.send('ar.compilation.failed', {
            projectId,
            errorMessage,
            status: 'error'
        });
    }
    /**
     * Request email notification from backend
     */
    async requestEmailNotification(projectId, userId, viewUrl) {
        return this.send('ar.email.request', {
            projectId,
            userId,
            viewUrl,
            emailType: 'ar_ready'
        });
    }
}
exports.WebhookClient = WebhookClient;
exports.webhookClient = new WebhookClient();
//# sourceMappingURL=webhook-client.js.map