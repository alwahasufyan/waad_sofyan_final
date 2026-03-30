const DEFAULT_BRAND = {
  companyName: 'وعد لإدارة النفقات الطبية',
  systemName: 'نظام إدارة النفقات الطبية',
  logoPath: '/waad-icon.png',
  primaryColor: '#0b7285',
  accentColor: '#0f9d58',
  qrApiBase: 'https://api.qrserver.com/v1/create-qr-code/'
};

const formatIssuedAt = () => new Date().toLocaleString('ar-LY');

const buildQrCodeImageUrl = (value, size = 180, qrApiBase = DEFAULT_BRAND.qrApiBase) => {
  const encoded = encodeURIComponent(value || 'WAAD');
  return `${qrApiBase}?size=${size}x${size}&margin=0&data=${encoded}`;
};

export const buildWaadPrintDocument = ({
  title,
  subtitle = '',
  contentHtml = '',
  companyName = DEFAULT_BRAND.companyName,
  systemName = DEFAULT_BRAND.systemName,
  logoUrl = `${window.location.origin}${DEFAULT_BRAND.logoPath}`,
  primaryColor = DEFAULT_BRAND.primaryColor,
  accentColor = DEFAULT_BRAND.accentColor,
  footerNote = '',
  issuedAt,
  verificationMeta
}) => {
  const issuedAtText = issuedAt || formatIssuedAt();
  const hasVerification = verificationMeta && (verificationMeta.docCode || verificationMeta.qrValue);
  const qrImageUrl = hasVerification ? buildQrCodeImageUrl(verificationMeta.qrValue || verificationMeta.docCode, verificationMeta.qrSize || 180) : '';

  return `
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>${title || 'تقرير'}</title>
        <style>
          :root {
            --brand-primary: ${primaryColor};
            --brand-accent: ${accentColor};
            --brand-border: #d8e2e7;
            --brand-muted: #5f7380;
            --page-bg: #f6fafb;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 14px;
            font-family: "Tahoma", "Arial", sans-serif;
            background: var(--page-bg);
            color: #1f2933;
            direction: rtl;
          }
          .sheet {
            position: relative;
            border: 1px solid var(--brand-border);
            border-radius: 12px;
            background: #fff;
            overflow: hidden;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-16deg);
            font-size: 34px;
            font-weight: 800;
            color: rgba(11, 114, 133, 0.05);
            letter-spacing: 2px;
            pointer-events: none;
            user-select: none;
            white-space: nowrap;
            z-index: 0;
          }
          .sheet-header {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 14px;
            border-bottom: 1px solid var(--brand-border);
            background: linear-gradient(135deg, #edf7f9 0%, #ffffff 60%);
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .brand img {
            width: 42px;
            height: 42px;
            object-fit: contain;
            border: 1px solid #d5e6ea;
            border-radius: 10px;
            padding: 3px;
            background: #fff;
          }
          .brand-title {
            margin: 0;
            font-size: 17px;
            color: var(--brand-primary);
            font-weight: 800;
          }
          .brand-subtitle {
            margin: 2px 0 0;
            font-size: 11px;
            color: var(--brand-muted);
          }
          .doc-title h2 {
            margin: 0;
            font-size: 17px;
            color: #0f172a;
            font-weight: 800;
          }
          .doc-title p {
            margin: 3px 0 0;
            font-size: 11px;
            color: var(--brand-muted);
          }
          .verify-box {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 1px solid var(--brand-border);
            border-radius: 10px;
            padding: 5px;
            background: #fff;
          }
          .verify-box img {
            width: 88px;
            height: 88px;
            border: 1px solid #dbe6eb;
            border-radius: 8px;
            background: #fff;
            flex-shrink: 0;
          }
          .verify-meta { font-size: 11px; color: var(--brand-muted); line-height: 1.5; }
          .verify-meta strong { color: #1f2933; font-size: 11px; }
          .sheet-body {
            position: relative;
            z-index: 1;
            padding: 12px 14px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(120px, 1fr));
            gap: 8px;
            margin: 8px 0 12px;
          }
          .summary-item {
            border: 1px solid var(--brand-border);
            border-radius: 8px;
            padding: 7px;
            background: #fbfdfe;
          }
          .summary-label {
            display: block;
            font-size: 11px;
            color: var(--brand-muted);
            margin-bottom: 3px;
          }
          .summary-value { font-size: 14px; font-weight: 700; color: #102a43; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #d9e3e8;
            padding: 6px;
            vertical-align: top;
          }
          th {
            background: #eaf4f6;
            color: #124559;
            font-weight: 700;
          }
          .sheet-footer {
            border-top: 1px solid var(--brand-border);
            padding: 8px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: var(--brand-muted);
            background: #fcfeff;
            position: relative;
            z-index: 1;
          }
          @media print {
            body { background: #fff; padding: 0; }
            .sheet { border: none; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="watermark">${companyName}</div>
          <div class="sheet-header">
            <div class="brand">
              <img src="${logoUrl}" alt="WAAD" />
              <div>
                <h1 class="brand-title">${companyName}</h1>
                <p class="brand-subtitle">${systemName}</p>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="doc-title">
                <h2>${title || '-'}</h2>
                <p>${subtitle || ''}</p>
              </div>
              ${
                hasVerification
                  ? `<div class="verify-box">
                       <img src="${qrImageUrl}" alt="QR" />
                       <div class="verify-meta">
                         ${verificationMeta.docCode ? `<div><strong>رمز المستند:</strong> ${verificationMeta.docCode}</div>` : ''}
                         ${verificationMeta.providerCode ? `<div><strong>مقدم الخدمة:</strong> ${verificationMeta.providerCode}</div>` : ''}
                         <div><strong>وقت الإصدار:</strong> ${issuedAtText}</div>
                       </div>
                     </div>`
                  : ''
              }
            </div>
          </div>
          <div class="sheet-body">${contentHtml}</div>
          <div class="sheet-footer">
            <span>${companyName}</span>
            <span>${footerNote || `تاريخ الإصدار: ${issuedAtText}`}</span>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const openWaadPrintWindow = (options) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.write(buildWaadPrintDocument(options));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
  return true;
};
