import React, { useState } from 'react';
import { X, Download, Archive, CheckCircle2, Loader2, ShieldCheck, MapPin, Camera } from 'lucide-react';
import JSZip from 'jszip';
import { ImageFileItem, WatermarkConfig, AppTheme } from '../types';
import { createWatermarkedImageBlob, loadImage } from '../utils/watermarkEngine';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  images: ImageFileItem[];
  selectedIndex: number;
  config: WatermarkConfig;
  theme?: AppTheme;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  images,
  selectedIndex,
  config,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [exportFormat, setExportFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [quality, setQuality] = useState<number>(0.94);
  const [preserveExif, setPreserveExif] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [completedMessage, setCompletedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentImg = images[selectedIndex] || images[0];

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // Export currently active single photo
  const handleExportSingle = async () => {
    if (!currentImg) return;
    try {
      setIsProcessing(true);
      const imgElem = await loadImage(currentImg.objectUrl);
      const segments =
        preserveExif && exportFormat === 'image/jpeg' && currentImg.exif?.rawSegments
          ? currentImg.exif.rawSegments
          : undefined;

      const blob = await createWatermarkedImageBlob(
        imgElem,
        config,
        exportFormat,
        quality,
        segments
      );

      const ext = exportFormat === 'image/png' ? 'png' : 'jpg';
      const baseName = currentImg.name.replace(/\.[^/.]+$/, '');
      const exifSuffix = segments && segments.length > 0 ? '_含EXIF_GPS' : '';
      const filename = `${baseName}_水印保护${exifSuffix}.${ext}`;

      triggerDownload(blob, filename);
      setCompletedMessage(
        `已成功导出：${filename} ${segments && segments.length > 0 ? '(原图EXIF与GPS已保留)' : ''}`
      );
    } catch (err) {
      console.error('Export single failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch export all photos into a ZIP archive
  const handleExportZip = async () => {
    if (images.length === 0) return;
    try {
      setIsProcessing(true);
      setCompletedMessage(null);
      const zip = new JSZip();
      const ext = exportFormat === 'image/png' ? 'png' : 'jpg';

      for (let i = 0; i < images.length; i++) {
        setCurrentProgress({ current: i + 1, total: images.length });
        const item = images[i];
        const imgElem = await loadImage(item.objectUrl);
        const segments =
          preserveExif && exportFormat === 'image/jpeg' && item.exif?.rawSegments
            ? item.exif.rawSegments
            : undefined;

        const blob = await createWatermarkedImageBlob(
          imgElem,
          config,
          exportFormat,
          quality,
          segments
        );

        const baseName = item.name.replace(/\.[^/.]+$/, '');
        const filename = `${baseName}_水印_${i + 1}.${ext}`;
        zip.file(filename, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      triggerDownload(zipBlob, `水印照片批量打包_${new Date().toISOString().slice(0, 10)}.zip`);

      setCompletedMessage(`已成功批量打包下载 ${images.length} 张照片 (原图拍摄信息已保留)！`);
    } catch (err) {
      console.error('Batch export failed:', err);
    } finally {
      setIsProcessing(false);
      setCurrentProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div
        className={`relative w-full max-w-md rounded-xl shadow-2xl p-4 space-y-3 border transition-colors ${
          isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-2.5 border-b ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">导出带水印照片</h3>
              <p className="text-[10px] text-zinc-500 font-mono">
                原始高分辨率（Full HD/4K）本地渲染
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isLight ? 'text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Settings */}
        <div className="space-y-2.5 text-xs">
          {/* Format selection */}
          <div className="space-y-1">
            <label className={`font-semibold text-[11px] ${isLight ? 'text-zinc-800' : 'text-zinc-300'}`}>输出图片格式</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setExportFormat('image/jpeg')}
                className={`p-2 rounded-lg border text-left transition-all ${
                  exportFormat === 'image/jpeg'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-white font-medium ring-1 ring-blue-500/30'
                    : isLight
                    ? 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="font-semibold text-xs">JPG 格式 (推荐)</div>
                <div className="text-[10px] text-zinc-500">支持保留完整 EXIF/GPS 元数据</div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('image/png')}
                className={`p-2 rounded-lg border text-left transition-all ${
                  exportFormat === 'image/png'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-white font-medium ring-1 ring-blue-500/30'
                    : isLight
                    ? 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="font-semibold text-xs">PNG 格式</div>
                <div className="text-[10px] text-zinc-500">无损高保真，透明通道</div>
              </button>
            </div>
          </div>

          {/* EXIF Metadata Retention Card */}
          <div
            className={`p-2.5 rounded-lg border transition-all ${
              preserveExif
                ? isLight
                  ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                  : 'bg-blue-950/20 border-blue-500/30 text-blue-200'
                : isLight
                ? 'bg-zinc-50 border-zinc-200 text-zinc-600'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveExif}
                  onChange={(e) => setPreserveExif(e.target.checked)}
                  className="rounded accent-blue-600 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="font-bold text-xs">
                  保留原图拍摄信息 (GPS地理位置/镜头/相机)
                </span>
              </label>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
                {currentImg?.exif?.hasExif ? '已解析EXIF' : '自动保留'}
              </span>
            </div>

            {preserveExif && currentImg?.exif && (
              <div
                className={`mt-2 pt-2 border-t text-[10px] font-mono space-y-0.5 ${
                  isLight ? 'border-blue-200/80 text-zinc-600' : 'border-zinc-800/80 text-zinc-400'
                }`}
              >
                {currentImg.exif.camera && (
                  <div className="flex items-center gap-1">
                    <span>📷 相机机型:</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{currentImg.exif.camera}</span>
                  </div>
                )}
                {currentImg.exif.lens && (
                  <div className="flex items-center gap-1">
                    <span>🔍 镜头型号:</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{currentImg.exif.lens}</span>
                  </div>
                )}
                {currentImg.exif.gps && (
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span>📍 GPS地理位置:</span>
                    <span className="font-bold">{currentImg.exif.gps}</span>
                  </div>
                )}
                {currentImg.exif.dateTime && (
                  <div className="flex items-center gap-1">
                    <span>⏱ 原始拍摄时间:</span>
                    <span className="font-medium">{currentImg.exif.dateTime}</span>
                  </div>
                )}
                {!currentImg.exif.camera && !currentImg.exif.gps && (
                  <div className="text-emerald-600 dark:text-emerald-400">
                    ✓ 导出时将原图的所有底层元数据、色彩配置与坐标无损注入照片
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quality slider for JPG */}
          {exportFormat === 'image/jpeg' && (
            <div className={`space-y-1 p-2 rounded-lg border ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
              <div className="flex justify-between text-[11px]">
                <span className={`font-semibold ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>JPG 画质压缩率</span>
                <span className="font-mono text-zinc-500">{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.0"
                step="0.01"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className={`w-full accent-blue-600 h-1 rounded cursor-pointer ${isLight ? 'bg-zinc-200' : 'bg-zinc-800'}`}
              />
            </div>
          )}

          {/* Privacy Badge */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] leading-tight">
              所有图片均在您的设备本地合成渲染，零网络上传，保护敏感证件与个人隐私安全。
            </span>
          </div>

          {/* Progress / Status */}
          {isProcessing && currentProgress && (
            <div className={`space-y-1 p-2.5 rounded-lg border border-blue-500/30 ${isLight ? 'bg-blue-50/50' : 'bg-zinc-950'}`}>
              <div className="flex items-center justify-between text-[11px] text-blue-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  正在逐张高清渲染并注入EXIF...
                </span>
                <span className="font-mono">
                  {currentProgress.current} / {currentProgress.total}
                </span>
              </div>
              <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-200"
                  style={{
                    width: `${(currentProgress.current / currentProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {completedMessage && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-300 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{completedMessage}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-1.5 pt-1">
          {/* Download active single photo */}
          <button
            id="download-single-btn"
            disabled={isProcessing}
            onClick={handleExportSingle}
            className={`w-full h-8 px-3 rounded-md font-semibold text-xs border flex items-center justify-center gap-1.5 transition-all active:scale-98 disabled:opacity-50 ${
              isLight
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700'
            }`}
          >
            <Download className="w-3 h-3 text-blue-500" />
            <span>保存当前预览照片</span>
          </button>

          {/* Download all as zip */}
          {images.length > 1 && (
            <button
              id="download-all-zip-btn"
              disabled={isProcessing}
              onClick={handleExportZip}
              className="w-full h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-98"
            >
              <Archive className="w-3 h-3" />
              <span>批量打包全部 ({images.length} 张照片 .ZIP)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
