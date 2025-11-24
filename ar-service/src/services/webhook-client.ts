import axios, { AxiosError } from 'axios';

// Webhook client for notifying main backend
// AR-service → Backend communication

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:5002';
const WEBHOOK_SECRET = process.env.BACKEND_WEBHOOK_SECRET || '';

interface WebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: string;
}

export class WebhookClient {
  
  /**
   * Send webhook to main backend
   */
  async send(event: string, data: Record<string, any>): Promise<boolean> {
    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[Webhook] 📤 Sending: ${event}`, data);
    
    try {
      const response = await axios.post(
        `${BACKEND_URL}/webhooks/ar-service`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': WEBHOOK_SECRET
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      console.log(`[Webhook] ✅ Success: ${event}`, response.status);
      return true;
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error(`[Webhook] ❌ Failed: ${event}`, {
          status: axiosError.response?.status,
          message: axiosError.message
        });
      } else {
        console.error(`[Webhook] ❌ Failed: ${event}`, error);
      }
      
      return false;
    }
  }
  
  /**
   * Notify backend that AR compilation completed
   */
  async notifyCompilationComplete(projectId: string, viewUrl: string, qrCodeUrl: string) {
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
  async notifyCompilationFailed(projectId: string, errorMessage: string) {
    return this.send('ar.compilation.failed', {
      projectId,
      errorMessage,
      status: 'error'
    });
  }
  
  /**
   * Request email notification from backend
   */
  async requestEmailNotification(projectId: string, userId: string, viewUrl: string) {
    return this.send('ar.email.request', {
      projectId,
      userId,
      viewUrl,
      emailType: 'ar_ready'
    });
  }
}

export const webhookClient = new WebhookClient();
