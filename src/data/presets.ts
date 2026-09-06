import { WatermarkPreset, WatermarkConfig } from '../types';

export const formatCurrentTimestampWithSeconds = (prefix: string = '现场记录'): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${prefix} · ${y}-${m}-${d} ${hh}:${mm}:${ss}`;
};

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  mode: 'tile',
  text: '仅供办理业务使用 他用无效',
  color: '#dc2626', // red
  fontSizeRatio: 0.038,
  opacity: 0.35,
  rotation: -30,
  position: 'center',
  customX: 50,
  customY: 50,
  bold: true,
  hasShadow: false,
  hasStroke: true,
  strokeColor: '#ffffff',
  tileSpacing: 2.2,
  isStaggered: true,
  imageLogoUrl: null,
  imageScale: 0.25,
};

export const WATERMARK_PRESETS: WatermarkPreset[] = [
  {
    id: 'id-protection',
    name: '身份证件防盗',
    description: '全屏倾斜平铺，防止证件被冒用贷款或登记',
    tag: '证件首选',
    config: {
      mode: 'tile',
      text: '仅供办理业务使用 他用无效',
      color: '#dc2626',
      fontSizeRatio: 0.035,
      opacity: 0.35,
      rotation: -30,
      hasStroke: true,
      strokeColor: '#ffffff',
      tileSpacing: 2.2,
      isStaggered: true,
      bold: true,
    },
  },
  {
    id: 'copy-invalid',
    name: '复印防翻拍',
    description: '高密度防翻拍警示，覆盖关键个人信息',
    tag: '合同凭证',
    config: {
      mode: 'tile',
      text: '证件复印件 严禁他用 翻拍无效',
      color: '#2563eb',
      fontSizeRatio: 0.032,
      opacity: 0.32,
      rotation: -35,
      hasStroke: false,
      tileSpacing: 2.0,
      isStaggered: true,
      bold: true,
    },
  },
  {
    id: 'sample-confidential',
    name: '样张 SAMPLE',
    description: '居中大字样张，防止设计稿与商品样照未授权使用',
    tag: '设计作品',
    config: {
      mode: 'text',
      text: '样张 SAMPLE - 严禁商用',
      color: '#ef4444',
      position: 'center',
      fontSizeRatio: 0.075,
      opacity: 0.45,
      rotation: -35,
      hasShadow: true,
      hasStroke: true,
      strokeColor: '#ffffff',
      bold: true,
    },
  },
  {
    id: 'photo-copyright',
    name: '摄影版权标记',
    description: '右下角精致小字，彰显原创摄影师签名',
    tag: '摄影作品',
    config: {
      mode: 'text',
      text: `© ${new Date().getFullYear()} PHOTOGRAPHY · ALL RIGHTS RESERVED`,
      color: '#ffffff',
      position: 'bottom-right',
      fontSizeRatio: 0.024,
      opacity: 0.85,
      rotation: 0,
      hasShadow: true,
      hasStroke: false,
      bold: false,
    },
  },
  {
    id: 'time-punch',
    name: '现场时间戳',
    description: '左下角现场巡检、考勤打卡实况时间印记（精确到秒）',
    tag: '精确到秒',
    config: {
      mode: 'text',
      text: formatCurrentTimestampWithSeconds('现场记录'),
      color: '#facc15', // amber yellow
      position: 'bottom-left',
      fontSizeRatio: 0.028,
      opacity: 0.9,
      rotation: 0,
      hasShadow: true,
      hasStroke: true,
      strokeColor: '#000000',
      bold: true,
    },
  },
  {
    id: 'internal-secret',
    name: '内部绝密文件',
    description: '全屏网状水印，标识内部流转防泄密',
    tag: '企业保密',
    config: {
      mode: 'tile',
      text: '内部保密资料 严禁截屏外传',
      color: '#475569',
      fontSizeRatio: 0.033,
      opacity: 0.28,
      rotation: -28,
      hasStroke: false,
      tileSpacing: 2.5,
      isStaggered: true,
      bold: true,
    },
  },
];

const CUSTOM_PRESETS_STORAGE_KEY = 'watermark_custom_presets_v1';

export function loadCustomPresets(): WatermarkPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load custom presets:', e);
    return [];
  }
}

export function saveCustomPresetToStorage(preset: WatermarkPreset): WatermarkPreset[] {
  try {
    const current = loadCustomPresets();
    const updated = [preset, ...current.filter((p) => p.id !== preset.id)];
    localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save custom preset:', e);
    return [];
  }
}

export function deleteCustomPresetFromStorage(id: string): WatermarkPreset[] {
  try {
    const current = loadCustomPresets();
    const updated = current.filter((p) => p.id !== id);
    localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to delete custom preset:', e);
    return [];
  }
}

/**
 * Converts an uploaded image File into an optimized Data URL (Base64)
 * with a maximum dimension constraint (default 512px) to preserve transparency
 * and allow persistent storage inside localStorage presets without expiring.
 */
export function fileToOptimizedDataUrl(file: File, maxDim: number = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w <= maxDim && h <= maxDim && file.type === 'image/png') {
          resolve(src);
          return;
        }
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h / w) * maxDim);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w / h) * maxDim);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        // Export as PNG to preserve alpha channel / transparency of user's watermark
        const dataUrl = canvas.toDataURL('image/png', 0.92);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface BuiltinStamp {
  id: string;
  name: string;
  enName: string;
  color: string;
  borderColor: string;
}

export const BUILTIN_STAMPS: BuiltinStamp[] = [
  { id: 'stamp-approved', name: '审核通过', enName: 'APPROVED', color: '#16a34a', borderColor: '#22c55e' },
  { id: 'stamp-confidential', name: '绝密文件', enName: 'CONFIDENTIAL', color: '#dc2626', borderColor: '#ef4444' },
  { id: 'stamp-original', name: '原创版权', enName: 'ORIGINAL WORK', color: '#2563eb', borderColor: '#3b82f6' },
  { id: 'stamp-certified', name: '官方认证', enName: 'VERIFIED', color: '#ca8a04', borderColor: '#eab308' },
];
