import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';

interface SendARReadyEmailParams {
  userEmail: string;
  userName: string;
  arId: string;
  viewUrl: string;
  qrCodePath: string;
  markerQuality?: number;
  keyPointsCount?: number;
}

/**
 * Отправить email уведомление когда AR проект готов
 */
export async function sendARReadyEmail(params: SendARReadyEmailParams): Promise<void> {
  const {
    userEmail,
    userName,
    arId,
    viewUrl,
    qrCodePath,
    markerQuality,
    keyPointsCount,
  } = params;

  // Configure email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Read QR code as attachment
  const qrCodeBuffer = await fs.readFile(qrCodePath);

  // Email HTML content
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #6366f1;
      margin: 0;
      font-size: 28px;
    }
    .success-icon {
      background: #10b981;
      color: white;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 32px;
    }
    .qr-code {
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .qr-code img {
      max-width: 300px;
      width: 100%;
      height: auto;
      border: 4px solid white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .instructions {
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .instructions h3 {
      margin-top: 0;
      color: #1e40af;
    }
    .instructions ol {
      margin: 10px 0;
      padding-left: 20px;
    }
    .instructions li {
      margin: 8px 0;
    }
    .stats {
      display: flex;
      justify-content: space-around;
      margin: 20px 0;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .stat {
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #6366f1;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
    }
    .button {
      display: inline-block;
      background: #6366f1;
      color: white;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background: #4f46e5;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .tip {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✓</div>
      <h1>Ваш AR-эффект готов!</h1>
      <p>Здравствуйте, ${userName}! 👋</p>
    </div>

    <p>Отличные новости! Мы создали AR-эффект для вашей фотографии. Теперь вы можете увидеть видео прямо поверх фото с помощью камеры телефона! 🎬</p>

    ${markerQuality || keyPointsCount ? `
    <div class="stats">
      ${markerQuality ? `
      <div class="stat">
        <div class="stat-value">${(markerQuality * 100).toFixed(0)}%</div>
        <div class="stat-label">Качество</div>
      </div>
      ` : ''}
      ${keyPointsCount ? `
      <div class="stat">
        <div class="stat-value">${keyPointsCount}</div>
        <div class="stat-label">Точек распознавания</div>
      </div>
      ` : ''}
    </div>
    ` : ''}

    <div class="qr-code">
      <h3>📱 Отсканируйте QR-код</h3>
      <img src="cid:qrcode" alt="QR Code" />
      <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">
        Или откройте ссылку на телефоне:<br>
        <a href="${viewUrl}" style="color: #6366f1; word-break: break-all;">${viewUrl}</a>
      </p>
    </div>

    <div class="instructions">
      <h3>🎯 Как использовать AR:</h3>
      <ol>
        <li><strong>Отсканируйте QR-код</strong> выше с помощью камеры телефона</li>
        <li><strong>Разрешите доступ к камере</strong> когда браузер попросит</li>
        <li><strong>Наведите камеру на фотографию</strong> (ту, которую вы загружали)</li>
        <li><strong>Видео автоматически появится</strong> поверх фотографии! ✨</li>
      </ol>
    </div>

    <div class="tip">
      <strong>💡 Совет:</strong> Держите телефон на расстоянии 20-40см от фотографии. Убедитесь что освещение хорошее, и камера фокусируется на фото.
    </div>

    <div style="text-align: center;">
      <a href="${viewUrl}" class="button">Открыть AR Viewer</a>
    </div>

    <div class="instructions" style="background: #fef2f2; border-left-color: #ef4444;">
      <h3 style="color: #991b1b;">❗ Важно понять:</h3>
      <ul style="list-style: none; padding: 0;">
        <li>✅ <strong>QR-код</strong> нужен только для открытия AR viewer на телефоне</li>
        <li>✅ <strong>Фотография сама является маркером</strong> — камера распознаёт её без QR</li>
        <li>✅ На физической фотографии <strong>НЕТ никаких QR-кодов</strong> — она остаётся красивой!</li>
        <li>✅ AR работает <strong>на любом современном телефоне</strong> с камерой</li>
      </ul>
    </div>

    <div class="footer">
      <p>Если у вас возникли вопросы, свяжитесь с нами:<br>
      📧 <a href="mailto:support@photobooksgallery.am" style="color: #6366f1;">support@photobooksgallery.am</a><br>
      🌐 <a href="https://photobooksgallery.am" style="color: #6366f1;">photobooksgallery.am</a></p>
      
      <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
        ID проекта: ${arId}<br>
        PhotoBooks Gallery © ${new Date().getFullYear()}
      </p>
    </div>
  </div>
</body>
</html>
  `;

  // Send email
  const mailOptions = {
    from: `"PhotoBooks Gallery" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: '✨ Ваш AR-эффект готов! | PhotoBooks Gallery',
    html: htmlContent,
    attachments: [
      {
        filename: 'qr-code.png',
        content: qrCodeBuffer,
        cid: 'qrcode', // Content ID for embedding in HTML
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] AR ready notification sent to ${userEmail}:`, info.messageId);
  } catch (error) {
    console.error(`[Email] Failed to send AR notification to ${userEmail}:`, error);
    throw error;
  }
}

/**
 * Отправить тестовый email (для проверки настроек)
 */
export async function sendTestEmail(to: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"PhotoBooks Gallery" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Test Email from PhotoBooks Gallery',
    html: '<p>Email настройки работают корректно! ✅</p>',
  });

  console.log(`[Email] Test email sent to ${to}`);
}
