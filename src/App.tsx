import React, { useState, useEffect, useCallback } from 'react';
import { AndroidHeader } from './components/AndroidHeader';
import { CanvasPreview } from './components/CanvasPreview';
import { ThumbnailsBar } from './components/ThumbnailsBar';
import { WatermarkControlPanel } from './components/WatermarkControlPanel';
import { ExportDialog } from './components/ExportDialog';
import { InstallGuideModal } from './components/InstallGuideModal';
import { ImageFileItem, WatermarkConfig, WatermarkPreset, AppTheme } from './types';
import { DEFAULT_WATERMARK_CONFIG } from './data/presets';
import { createSampleDemoImage } from './utils/watermarkEngine';
import { extractExifSegments } from './utils/exifHelper';

export default function App() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('watermark_app_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });
  const [images, setImages] = useState<ImageFileItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [config, setConfig] = useState<WatermarkConfig>(DEFAULT_WATERMARK_CONFIG);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState<boolean>(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('09:41');

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next: AppTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('watermark_app_theme', next);
      return next;
    });
  };

  // Live system clock for simulated Android status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Preload a demo ID card sample on initial load so user sees full live functionality immediately
  useEffect(() => {
    const initDemo = async () => {
      try {
        const sampleFile = await createSampleDemoImage('id_card');
        const buffer = await sampleFile.arrayBuffer();
        const { meta } = extractExifSegments(buffer);
        const url = URL.createObjectURL(sampleFile);
        const img = new Image();
        img.onload = () => {
          setImages([
            {
              id: 'demo-sample-1',
              name: sampleFile.name,
              file: sampleFile,
              objectUrl: url,
              width: img.naturalWidth,
              height: img.naturalHeight,
              size: sampleFile.size,
              exif: meta,
            },
          ]);
          setSelectedIndex(0);
        };
        img.src = url;
      } catch (e) {
        console.error('Failed to init demo sample:', e);
      }
    };
    initDemo();
  }, []);

  // Process selected files from 相册 or camera
  const handleSelectFiles = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileList.length === 0) return;

    const newItems: ImageFileItem[] = [];

    for (const file of fileList) {
      const url = URL.createObjectURL(file);
      let exifMeta;
      try {
        const buffer = await file.arrayBuffer();
        const { meta } = extractExifSegments(buffer);
        exifMeta = meta;
      } catch (e) {
        console.warn('Could not parse EXIF for file:', file.name, e);
      }

      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          newItems.push({
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            file,
            objectUrl: url,
            width: img.naturalWidth,
            height: img.naturalHeight,
            size: file.size,
            exif: exifMeta,
          });
          resolve();
        };
        img.onerror = () => resolve();
        img.src = url;
      });
    }

    if (newItems.length > 0) {
      setImages((prev) => {
        const combined = [...prev, ...newItems];
        setSelectedIndex(prev.length);
        return combined;
      });
    }
  }, []);

  // Load sample demo photo
  const handleLoadSample = async (type: 'id_card' | 'document' | 'landscape') => {
    const file = await createSampleDemoImage(type);
    let exifMeta;
    try {
      const buffer = await file.arrayBuffer();
      const { meta } = extractExifSegments(buffer);
      exifMeta = meta;
    } catch (e) {
      console.warn('EXIF extract error:', e);
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const newItem: ImageFileItem = {
        id: `sample-${Date.now()}`,
        name: file.name,
        file,
        objectUrl: url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
        exif: exifMeta,
      };
      setImages((prev) => {
        const updated = [...prev, newItem];
        setSelectedIndex(updated.length - 1);
        return updated;
      });
    };
    img.src = url;
  };

  // Remove photo
  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      if (selectedIndex >= filtered.length) {
        setSelectedIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  // Clear all photos
  const handleClearAll = () => {
    if (window.confirm('确定要清空所有已加载的照片吗？')) {
      setImages([]);
      setSelectedIndex(0);
    }
  };

  // Update watermark config
  const handleUpdateConfig = (partial: Partial<WatermarkConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  // Apply preset
  const handleApplyPreset = (preset: WatermarkPreset) => {
    setConfig((prev) => ({ ...prev, ...preset.config }));
  };

  const currentActiveImage = images[selectedIndex] || null;
  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen w-full flex items-center justify-center p-0 md:p-2 selection:bg-blue-600 transition-colors duration-200 ${
        isLight ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-950 text-zinc-100'
      }`}
    >
      {/* Container - Handles either Phone Mockup or Full View */}
      <div
        className={`w-full transition-all duration-200 flex flex-col overflow-hidden ${
          isLight ? 'bg-white' : 'bg-zinc-900'
        } ${
          isPhoneFrame
            ? `max-w-[460px] md:h-[95vh] md:max-h-[920px] md:rounded-[32px] md:border-2 md:shadow-[0_16px_48px_-10px_rgba(0,0,0,0.4)] ${
                isLight ? 'md:border-zinc-300 ring-1 ring-zinc-300' : 'md:border-zinc-800 ring-1 ring-zinc-800/60'
              }`
            : `max-w-7xl h-screen md:h-[97vh] md:rounded-xl md:border shadow-2xl ${
                isLight ? 'md:border-zinc-300 ring-1 ring-zinc-200' : 'md:border-zinc-800 ring-1 ring-zinc-800/50'
              }`
        }`}
      >
        {/* Simulated Android Front Camera / Punch Hole for Phone Frame */}
        {isPhoneFrame && (
          <div className={`hidden md:flex justify-center pt-1.5 pb-0.5 ${isLight ? 'bg-zinc-100' : 'bg-zinc-950'}`}>
            <div className={`w-3.5 h-3.5 rounded-full ring-1 flex items-center justify-center ${isLight ? 'bg-zinc-300 ring-zinc-400' : 'bg-black ring-zinc-800'}`}>
              <div className={`w-1 h-1 rounded-full ${isLight ? 'bg-zinc-500' : 'bg-zinc-800'}`}></div>
            </div>
          </div>
        )}

        {/* Top Header & Status Bar */}
        <AndroidHeader
          isPhoneFrame={isPhoneFrame}
          onTogglePhoneFrame={() => setIsPhoneFrame((v) => !v)}
          onExport={() => setIsExportOpen(true)}
          onClearAll={handleClearAll}
          onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
          hasImages={images.length > 0}
          imageCount={images.length}
          currentTimeStr={currentTimeStr}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Body Area: Canvas + Bottom Controls */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Main Visual Canvas Area */}
          <div className="flex-1 w-full min-h-0 relative">
            <CanvasPreview
              currentImage={currentActiveImage}
              config={config}
              onUpdateConfig={handleUpdateConfig}
              onSelectFiles={handleSelectFiles}
              onLoadSample={handleLoadSample}
              theme={theme}
            />
          </div>

          {/* Photo Thumbnails Switcher */}
          <ThumbnailsBar
            images={images}
            selectedIndex={selectedIndex}
            onSelectIndex={(idx) => setSelectedIndex(idx)}
            onRemoveImage={handleRemoveImage}
            onAddFiles={handleSelectFiles}
            theme={theme}
          />

          {/* Bottom Watermark Adjuster Panel */}
          <WatermarkControlPanel
            config={config}
            onUpdateConfig={handleUpdateConfig}
            onApplyPreset={handleApplyPreset}
            theme={theme}
          />
        </main>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        images={images}
        selectedIndex={selectedIndex}
        config={config}
        theme={theme}
      />

      {/* Install as Android App Guide */}
      <InstallGuideModal
        isOpen={isInstallGuideOpen}
        onClose={() => setIsInstallGuideOpen(false)}
      />
    </div>
  );
}
