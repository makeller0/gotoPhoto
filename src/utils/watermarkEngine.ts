import { WatermarkConfig, PositionAnchor } from '../types';
import { BUILTIN_STAMPS } from '../data/presets';
import { injectExifSegments, createDemoSampleExifSegment } from './exifHelper';

// Cache for loaded images
const imageCache = new Map<string, HTMLImageElement>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    const cached = imageCache.get(src)!;
    if (cached.complete) return Promise.resolve(cached);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Draws the watermark onto a target canvas context
 */
export async function renderWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: WatermarkConfig
): Promise<void> {
  const minDim = Math.min(width, height);

  if (config.mode === 'text') {
    renderSingleText(ctx, width, height, config, minDim);
  } else if (config.mode === 'tile') {
    renderTiledText(ctx, width, height, config, minDim);
  } else if (config.mode === 'image') {
    await renderImageWatermark(ctx, width, height, config, minDim);
  }
}

function getAnchorCoordinates(
  anchor: PositionAnchor,
  width: number,
  height: number,
  padding: number,
  customX: number,
  customY: number
): { x: number; y: number; align: CanvasTextAlign; baseline: CanvasTextBaseline } {
  if (anchor === 'custom') {
    return {
      x: (width * customX) / 100,
      y: (height * customY) / 100,
      align: 'center',
      baseline: 'middle',
    };
  }

  switch (anchor) {
    case 'top-left':
      return { x: padding, y: padding, align: 'left', baseline: 'top' };
    case 'top-center':
      return { x: width / 2, y: padding, align: 'center', baseline: 'top' };
    case 'top-right':
      return { x: width - padding, y: padding, align: 'right', baseline: 'top' };
    case 'center-left':
      return { x: padding, y: height / 2, align: 'left', baseline: 'middle' };
    case 'center':
      return { x: width / 2, y: height / 2, align: 'center', baseline: 'middle' };
    case 'center-right':
      return { x: width - padding, y: height / 2, align: 'right', baseline: 'middle' };
    case 'bottom-left':
      return { x: padding, y: height - padding, align: 'left', baseline: 'bottom' };
    case 'bottom-center':
      return { x: width / 2, y: height - padding, align: 'center', baseline: 'bottom' };
    case 'bottom-right':
    default:
      return { x: width - padding, y: height - padding, align: 'right', baseline: 'bottom' };
  }
}

function renderSingleText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: WatermarkConfig,
  minDim: number
) {
  const fontSize = Math.max(14, Math.round(minDim * config.fontSizeRatio));
  const padding = Math.max(20, Math.round(minDim * 0.04));
  const text = config.text.trim() || 'WATERMARK';

  ctx.save();
  ctx.globalAlpha = config.opacity;

  const fontStyle = `${config.bold ? '700' : '400'} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.font = fontStyle;

  const { x, y, align, baseline } = getAnchorCoordinates(
    config.position,
    width,
    height,
    padding,
    config.customX,
    config.customY
  );

  ctx.translate(x, y);
  if (config.rotation !== 0) {
    ctx.rotate((config.rotation * Math.PI) / 180);
  }

  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  if (config.hasShadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = Math.max(4, fontSize * 0.15);
    ctx.shadowOffsetX = Math.max(1.5, fontSize * 0.05);
    ctx.shadowOffsetY = Math.max(1.5, fontSize * 0.05);
  }

  if (config.hasStroke) {
    ctx.strokeStyle = config.strokeColor || '#ffffff';
    ctx.lineWidth = Math.max(2, fontSize * 0.09);
    ctx.lineJoin = 'round';
    ctx.strokeText(text, 0, 0);
  }

  ctx.fillStyle = config.color;
  ctx.fillText(text, 0, 0);

  ctx.restore();
}

function renderTiledText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: WatermarkConfig,
  minDim: number
) {
  const text = config.text.trim() || '仅供办理业务使用 他用无效';
  const fontSize = Math.max(13, Math.round(minDim * config.fontSizeRatio));

  ctx.save();
  ctx.globalAlpha = config.opacity;

  const fontStyle = `${config.bold ? '700' : '500'} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.font = fontStyle;

  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const stepX = textWidth + fontSize * 2.2 * config.tileSpacing;
  const stepY = fontSize * 3.2 * config.tileSpacing;

  // Move origin to center of canvas for smooth rotation
  ctx.translate(width / 2, height / 2);
  ctx.rotate((config.rotation * Math.PI) / 180);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Calculate diagonal reach so it covers all corners
  const diagonal = Math.sqrt(width * width + height * height);
  const rows = Math.ceil(diagonal / stepY) + 2;
  const cols = Math.ceil(diagonal / stepX) + 2;

  for (let r = -rows; r <= rows; r++) {
    const y = r * stepY;
    const xOffset = config.isStaggered && r % 2 !== 0 ? stepX / 2 : 0;

    for (let c = -cols; c <= cols; c++) {
      const x = c * stepX + xOffset;

      if (config.hasShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = Math.max(3, fontSize * 0.12);
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
      }

      if (config.hasStroke) {
        ctx.strokeStyle = config.strokeColor || '#ffffff';
        ctx.lineWidth = Math.max(1.5, fontSize * 0.08);
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, y);
      }

      ctx.fillStyle = config.color;
      ctx.fillText(text, x, y);
    }
  }

  ctx.restore();
}

async function renderImageWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: WatermarkConfig,
  minDim: number
) {
  const padding = Math.max(20, Math.round(minDim * 0.04));
  const { x, y } = getAnchorCoordinates(
    config.position,
    width,
    height,
    padding,
    config.customX,
    config.customY
  );

  ctx.save();
  ctx.globalAlpha = config.opacity;
  ctx.translate(x, y);

  if (config.rotation !== 0) {
    ctx.rotate((config.rotation * Math.PI) / 180);
  }

  if (config.imageLogoUrl) {
    try {
      const logoImg = await loadImage(config.imageLogoUrl);
      const targetW = minDim * config.imageScale;
      const targetH = (targetW / logoImg.naturalWidth) * logoImg.naturalHeight;

      ctx.drawImage(logoImg, -targetW / 2, -targetH / 2, targetW, targetH);
    } catch (e) {
      console.error('Failed to load logo image:', e);
    }
  } else if (config.presetStampId) {
    // Draw built-in vector stamp
    drawVectorStamp(ctx, config.presetStampId, minDim * config.imageScale);
  } else {
    // Draw default stamp
    drawVectorStamp(ctx, 'stamp-approved', minDim * config.imageScale);
  }

  ctx.restore();
}

function drawVectorStamp(ctx: CanvasRenderingContext2D, stampId: string, size: number) {
  const stamp = BUILTIN_STAMPS.find((s) => s.id === stampId) || BUILTIN_STAMPS[0];
  const w = size;
  const h = size * 0.45;
  const r = 8;

  ctx.save();
  // Outer border with slight stamp distress effect
  ctx.strokeStyle = stamp.borderColor;
  ctx.lineWidth = Math.max(3, size * 0.035);
  ctx.fillStyle = `${stamp.color}18`; // very light transparent fill

  // Draw rounded outer rect
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, r);
  ctx.fill();
  ctx.stroke();

  // Inner border
  const innerPad = Math.max(4, size * 0.03);
  ctx.lineWidth = Math.max(1.5, size * 0.015);
  ctx.beginPath();
  ctx.roundRect(-w / 2 + innerPad, -h / 2 + innerPad, w - innerPad * 2, h - innerPad * 2, r - 2);
  ctx.stroke();

  // Primary Chinese Stamp Text
  ctx.fillStyle = stamp.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const mainFontSize = Math.max(14, size * 0.16);
  ctx.font = `900 ${mainFontSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.fillText(stamp.name, 0, -h * 0.08);

  // Sub English / Tag Text
  const subFontSize = Math.max(9, size * 0.075);
  ctx.font = `700 ${subFontSize}px -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;
  ctx.letterSpacing = '2px';
  ctx.fillText(stamp.enName, 0, h * 0.24);

  ctx.restore();
}

/**
 * Creates high-resolution watermarked blob from source image with optional EXIF retention
 */
export async function createWatermarkedImageBlob(
  sourceImage: HTMLImageElement,
  config: WatermarkConfig,
  type: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality: number = 0.94,
  exifSegments?: Uint8Array[]
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.naturalWidth || sourceImage.width;
  canvas.height = sourceImage.naturalHeight || sourceImage.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Draw background image
  ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

  // Draw watermark
  await renderWatermark(ctx, canvas.width, canvas.height, config);

  const rawBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate image blob'));
      },
      type,
      quality
    );
  });

  // If exporting as JPEG and we have original EXIF segments, inject them!
  if (type === 'image/jpeg' && exifSegments && exifSegments.length > 0) {
    try {
      return await injectExifSegments(rawBlob, exifSegments);
    } catch (e) {
      console.warn('Failed to inject EXIF into exported blob, returning standard blob:', e);
      return rawBlob;
    }
  }

  return rawBlob;
}

/**
 * Generates sample demo photos for instant testing with authentic EXIF data
 */
export function createSampleDemoImage(type: 'id_card' | 'document' | 'landscape'): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    if (type === 'id_card') {
      canvas.width = 1200;
      canvas.height = 760;
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 1200, 760);
      grad.addColorStop(0, '#e0f2fe');
      grad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 760);

      // ID card header
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText('居民身份证 模拟样本 (TEST SAMPLE)', 100, 120);

      // Mock portrait box
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(860, 180, 240, 320);
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('照片区域', 980, 340);
      ctx.textAlign = 'left';

      // Mock text info
      ctx.fillStyle = '#334155';
      ctx.font = '32px sans-serif';
      ctx.fillText('姓  名： 张三 (示例)', 100, 220);
      ctx.fillText('性  别： 男   民 族： 汉', 100, 290);
      ctx.fillText('出  生： 1995 年 10 月 12 日', 100, 360);
      ctx.fillText('住  址： 示例市朝阳区科技路88号', 100, 430);
      ctx.fillText('公民身份证号码： 11010119951012XXXX', 100, 620);

      canvas.toBlob((blob) => {
        resolve(new File([blob!], '身份证样例照片_ID_Sample.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.95);
    } else if (type === 'document') {
      canvas.width = 1000;
      canvas.height = 1400;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 1000, 1400);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 48px serif';
      ctx.textAlign = 'center';
      ctx.fillText('商业合作保密协议 (样例)', 500, 160);

      ctx.font = '26px serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#475569';
      const lines = [
        '第一条 协议目的与机密信息范围',
        '双方就项目开发进行技术探讨，任何一方披露的业务、财务、算法',
        '及客户数据均属于保密范畴，未经授权严禁转让或提供给第三方。',
        '',
        '第二条 保密义务及知识产权归属',
        '接收方承诺采取不低于保护自身机密信息的合理谨慎程度予以保管。',
        '本文件仅供内部审查，禁止拍摄、复印及通过公共网络传输。',
        '',
        '签署日期：2026年09月06日',
        '甲 方 代表签字：___________________',
        '乙 方 代表签字：___________________',
      ];
      let lineY = 280;
      for (const line of lines) {
        ctx.fillText(line, 100, lineY);
        lineY += 56;
      }

      canvas.toBlob((blob) => {
        resolve(new File([blob!], '保密协议合同样例_Contract_Sample.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.95);
    } else {
      // Landscape photo mockup with genuine embedded Camera, Lens & GPS EXIF
      canvas.width = 1280;
      canvas.height = 850;
      const grad = ctx.createLinearGradient(0, 0, 0, 850);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.45, '#38bdf8');
      grad.addColorStop(0.5, '#fed7aa');
      grad.addColorStop(1, '#065f46');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 850);

      // Sun
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(640, 360, 90, 0, Math.PI * 2);
      ctx.fill();

      // Mountains
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, 550);
      ctx.lineTo(350, 360);
      ctx.lineTo(700, 560);
      ctx.lineTo(950, 410);
      ctx.lineTo(1280, 600);
      ctx.lineTo(1280, 850);
      ctx.lineTo(0, 850);
      ctx.closePath();
      ctx.fill();

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        // Inject demo EXIF segment with Sony ILCE-7M4, FE 24-70mm GM II lens, and GPS coordinates!
        const demoExif = createDemoSampleExifSegment();
        const blobWithExif = await injectExifSegments(blob, [demoExif]);
        resolve(new File([blobWithExif], '风景摄影原片_含GPS与镜头EXIF.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.95);
    }
  });
}
