import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Upload,
  Camera,
  Eye,
  RotateCw,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize,
  Sparkles,
  Image as ImageIcon,
  MapPin,
  Camera as CameraIcon,
  Info,
} from 'lucide-react';
import { ImageFileItem, WatermarkConfig, AppTheme } from '../types';
import { renderWatermark, loadImage } from '../utils/watermarkEngine';

interface CanvasPreviewProps {
  currentImage: ImageFileItem | null;
  config: WatermarkConfig;
  onUpdateConfig: (partial: Partial<WatermarkConfig>) => void;
  onSelectFiles: (files: FileList | File[]) => void;
  onLoadSample: (type: 'id_card' | 'document' | 'landscape') => void;
  theme?: AppTheme;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  currentImage,
  config,
  onUpdateConfig,
  onSelectFiles,
  onLoadSample,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isComparingOriginal, setIsComparingOriginal] = useState(false);
  const [isDraggingWatermark, setIsDraggingWatermark] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showExifModal, setShowExifModal] = useState(false);

  // Redraw preview canvas whenever image, config, or compare state changes
  const redrawCanvas = useCallback(async () => {
    if (!currentImage || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      setIsRendering(true);
      const img = await loadImage(currentImage.objectUrl);

      // We maintain the natural aspect ratio for the preview
      // Limit preview max dimension to 1400 to maintain smooth 60fps interaction
      const maxPreviewDim = 1200;
      let targetW = img.naturalWidth;
      let targetH = img.naturalHeight;

      if (targetW > maxPreviewDim || targetH > maxPreviewDim) {
        if (targetW >= targetH) {
          targetH = Math.round((targetH / targetW) * maxPreviewDim);
          targetW = maxPreviewDim;
        } else {
          targetW = Math.round((targetW / targetH) * maxPreviewDim);
          targetH = maxPreviewDim;
        }
      }

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      // Draw original photo
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Render watermark unless in "compare original" mode
      if (!isComparingOriginal) {
        await renderWatermark(ctx, targetW, targetH, config);
      }
    } catch (err) {
      console.error('Canvas render error:', err);
    } finally {
      setIsRendering(false);
    }
  }, [currentImage, config, isComparingOriginal]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Handle pointer down on canvas to drag watermark
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || config.mode === 'tile') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    setIsDraggingWatermark(true);
    onUpdateConfig({
      position: 'custom',
      customX: Math.max(2, Math.min(98, Math.round(clickX))),
      customY: Math.max(2, Math.min(98, Math.round(clickY))),
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingWatermark || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    onUpdateConfig({
      position: 'custom',
      customX: Math.max(2, Math.min(98, Math.round(clickX))),
      customY: Math.max(2, Math.min(98, Math.round(clickY))),
    });
  };

  const handlePointerUp = () => {
    setIsDraggingWatermark(false);
  };

  // Drag-and-drop file upload handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onSelectFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-zinc-950 transition-colors ${
        isDragOver ? 'ring-2 ring-blue-500 bg-blue-950/20' : ''
      }`}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onSelectFiles(e.target.files);
          }
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onSelectFiles(e.target.files);
          }
        }}
      />

      {currentImage ? (
        <div className="relative w-full h-full flex flex-col">
          {/* Top Canvas Action Overlay Bar */}
          <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
            {/* Resolution & EXIF Info Tag */}
            <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap">
              <div
                className={`flex items-center gap-1.5 h-6 px-2 rounded-md backdrop-blur border text-[10px] font-mono shadow-sm ${
                  isLight
                    ? 'bg-white/90 border-zinc-300 text-zinc-700'
                    : 'bg-zinc-950/90 border-zinc-800 text-zinc-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>
                  {currentImage.width} × {currentImage.height}
                </span>
                <span className="text-zinc-500">|</span>
                <span>{(currentImage.size / (1024 * 1024)).toFixed(1)} MB</span>
              </div>

              {/* EXIF Preservation Indicator */}
              {currentImage.exif?.hasExif && (
                <button
                  type="button"
                  onClick={() => setShowExifModal(true)}
                  className="flex items-center gap-1 h-6 px-2 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 backdrop-blur shadow-sm transition-all"
                  title="点击查看原图保留的 EXIF、GPS地理位置与镜头信息"
                >
                  <MapPin className="w-2.5 h-2.5" />
                  <span>
                    {currentImage.exif.gps ? '📍 GPS已保留' : '📷 EXIF已解析'}
                  </span>
                  <Info className="w-2.5 h-2.5 opacity-70" />
                </button>
              )}
            </div>

            {/* Quick Tools */}
            <div className="pointer-events-auto flex items-center gap-1">
              {/* Compare Original Button */}
              <button
                id="compare-original-btn"
                onMouseDown={() => setIsComparingOriginal(true)}
                onMouseUp={() => setIsComparingOriginal(false)}
                onTouchStart={() => setIsComparingOriginal(true)}
                onTouchEnd={() => setIsComparingOriginal(false)}
                className={`h-6 w-6 flex items-center justify-center rounded-md text-[11px] font-medium backdrop-blur shadow-sm transition-all select-none ${
                  isComparingOriginal
                    ? 'bg-amber-500 text-zinc-950 font-bold scale-95'
                    : isLight
                    ? 'bg-white/90 text-zinc-700 hover:text-black border border-zinc-300'
                    : 'bg-zinc-950/90 text-zinc-300 hover:text-white border border-zinc-800'
                }`}
                title="按住即可对比查看原图"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>

              {/* Reset Zoom */}
              <div
                className={`h-6 flex items-center rounded-md backdrop-blur border px-0.5 ${
                  isLight ? 'bg-white/90 border-zinc-300' : 'bg-zinc-950/90 border-zinc-800'
                }`}
              >
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                  className={`p-1 ${isLight ? 'text-zinc-600 hover:text-black' : 'text-zinc-400 hover:text-white'}`}
                  title="缩小"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className={`text-[10px] font-mono px-0.5 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                  className={`p-1 ${isLight ? 'text-zinc-600 hover:text-black' : 'text-zinc-400 hover:text-white'}`}
                  title="放大"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className={`p-1 ${isLight ? 'text-zinc-500 hover:text-black' : 'text-zinc-500 hover:text-zinc-200'}`}
                  title="适应屏幕"
                >
                  <Maximize className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Canvas Center Display */}
          <div
            className={`flex-1 w-full flex items-center justify-center p-2 sm:p-3 overflow-hidden select-none cursor-crosshair transition-colors duration-200 ${
              isLight ? 'bg-zinc-100/80' : 'bg-zinc-950'
            }`}
            style={{
              backgroundImage: isLight
                ? 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)'
                : 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }}
          >
            <div
              className={`relative transition-transform duration-100 ease-out shadow-2xl rounded-md overflow-hidden border ring-1 ${
                isLight ? 'border-zinc-300 ring-zinc-300/60' : 'border-zinc-800 ring-zinc-800/60'
              }`}
              style={{
                transform: `scale(${zoomLevel})`,
                maxWidth: '94%',
                maxHeight: '90%',
              }}
            >
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="w-auto h-auto max-h-[64vh] sm:max-h-[70vh] object-contain block touch-none"
              />

              {config.mode !== 'tile' && (
                <div className="absolute bottom-1.5 left-1.5 pointer-events-none px-1.5 py-0.5 rounded bg-black/75 backdrop-blur text-[9px] font-mono text-zinc-300 flex items-center gap-1 border border-zinc-800/80">
                  <Move className="w-2.5 h-2.5 text-blue-400" />
                  <span>点触拖拽调整位置</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State / Photo Upload Area */
        <div className="w-full max-w-sm p-4 sm:p-5 flex flex-col items-center text-center">
          <div
            className={`w-12 h-12 mb-3 rounded-xl border flex items-center justify-center text-blue-500 shadow-sm ${
              isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <ImageIcon className="w-6 h-6" />
          </div>

          <h2 className={`text-base font-bold mb-1 ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
            选择或拍摄待加水印照片
          </h2>
          <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed">
            纯本地处理，零网络上传，支持证件防盗、秒级时间戳与EXIF完整保留
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full mb-4">
            <button
              id="upload-gallery-btn"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:flex-1 h-9 flex items-center justify-center gap-1.5 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm transition-all active:scale-98"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>相册选择照片</span>
            </button>

            <button
              id="camera-take-btn"
              onClick={() => cameraInputRef.current?.click()}
              className={`w-full sm:flex-1 h-9 flex items-center justify-center gap-1.5 px-3 rounded-md font-medium text-xs border transition-all active:scale-98 ${
                isLight
                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-emerald-500" />
              <span>拍照加水印</span>
            </button>
          </div>

          {/* Instant Demo Samples */}
          <div className={`w-full pt-3 border-t ${isLight ? 'border-zinc-200' : 'border-zinc-800/80'}`}>
            <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-500 mb-2 font-mono">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>快速体验演示样本：</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                id="sample-id-btn"
                onClick={() => onLoadSample('id_card')}
                className={`h-8 px-2 rounded-md border text-[11px] transition-all text-center flex items-center justify-center ${
                  isLight
                    ? 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:border-blue-500/50'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:border-blue-500/50'
                }`}
              >
                🪪 身份证
              </button>
              <button
                id="sample-doc-btn"
                onClick={() => onLoadSample('document')}
                className={`h-8 px-2 rounded-md border text-[11px] transition-all text-center flex items-center justify-center ${
                  isLight
                    ? 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:border-blue-500/50'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:border-blue-500/50'
                }`}
              >
                📄 保密合同
              </button>
              <button
                id="sample-photo-btn"
                onClick={() => onLoadSample('landscape')}
                className={`h-8 px-2 rounded-md border text-[11px] transition-all text-center flex items-center justify-center ${
                  isLight
                    ? 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 hover:border-blue-500/50'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:border-blue-500/50'
                }`}
              >
                🌄 摄影(含EXIF)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXIF Inspection Modal */}
      {showExifModal && currentImage?.exif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-sm rounded-xl p-4 shadow-2xl border space-y-3 ${
              isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/40">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-sm">原图元数据与拍摄参数 (EXIF)</h4>
              </div>
              <button
                onClick={() => setShowExifModal(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className={`p-2 rounded-lg border space-y-1 ${isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700' : 'bg-zinc-950 border-zinc-800 text-zinc-300'}`}>
                <div className="flex justify-between">
                  <span className="text-zinc-500">相机机型:</span>
                  <span className="font-mono font-medium">{currentImage.exif.camera || '未记录或手机内置'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">镜头规格:</span>
                  <span className="font-mono font-medium">{currentImage.exif.lens || '标配镜头'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">拍摄时间:</span>
                  <span className="font-mono font-medium">{currentImage.exif.dateTime || '未记录'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">GPS地理信息:</span>
                  <span className="font-mono font-medium text-emerald-500">{currentImage.exif.gps || '无GPS坐标'}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
                <span className="shrink-0">✓</span>
                <span>导出时已启用「保留EXIF信息」，原图所有的地理坐标、相机和镜头信息将无损注入导出照片！</span>
              </div>
            </div>

            <button
              onClick={() => setShowExifModal(false)}
              className="w-full h-8 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
            >
              了解并关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
