import React from 'react';
import {
  Smartphone,
  Maximize2,
  Download,
  Trash2,
  HelpCircle,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { AppTheme } from '../types';

interface AndroidHeaderProps {
  isPhoneFrame: boolean;
  onTogglePhoneFrame: () => void;
  onExport: () => void;
  onClearAll: () => void;
  onOpenInstallGuide: () => void;
  hasImages: boolean;
  imageCount: number;
  theme: AppTheme;
  onToggleTheme: () => void;
}

export const AndroidHeader: React.FC<AndroidHeaderProps> = ({
  isPhoneFrame,
  onTogglePhoneFrame,
  onExport,
  onClearAll,
  onOpenInstallGuide,
  hasImages,
  imageCount,
  theme,
  onToggleTheme,
}) => {
  const isLight = theme === 'light';

  return (
    <header
      className={`w-full border-b select-none transition-colors duration-200 ${
        isLight ? 'bg-white/95 border-zinc-200 text-zinc-800' : 'bg-zinc-900/95 border-zinc-800 text-zinc-100'
      }`}
    >
      {/* Main App Bar */}
      <div className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-2 w-full">
        <div className="flex items-center gap-1.5 min-w-0 shrink-0">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shadow-sm shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
              <h1 className={`text-xs sm:text-sm md:text-base font-bold tracking-tight leading-none whitespace-nowrap ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
                水印添加器
              </h1>
              <span className="hidden min-[460px]:inline-block text-[9px] font-mono font-medium px-1 sm:px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 whitespace-nowrap shrink-0">
                本地离线
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5 hidden lg:block leading-none whitespace-nowrap">
              隐私版权防护 · 精确到秒 · 保留EXIF
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap">
          {/* Black / White Theme Toggle (Dark / Light) */}
          <button
            id="toggle-theme-btn"
            onClick={onToggleTheme}
            className={`h-7 flex items-center justify-center gap-1 px-1.5 sm:px-2 text-xs font-medium rounded-md border transition-colors shrink-0 whitespace-nowrap ${
              isLight
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border-zinc-700/60'
            }`}
            title={isLight ? '当前为浅色主题 (白)，点击切换为深色主题 (黑)' : '当前为深色主题 (黑)，点击切换为浅色主题 (白)'}
          >
            {isLight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-[11px] font-mono whitespace-nowrap leading-none hidden min-[440px]:inline">暗黑</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-mono whitespace-nowrap leading-none hidden min-[440px]:inline">明亮</span>
              </>
            )}
          </button>

          {/* Viewport Frame Toggle */}
          <button
            id="toggle-phone-frame-btn"
            onClick={onTogglePhoneFrame}
            className={`h-7 flex items-center justify-center gap-1 px-1.5 sm:px-2 text-xs font-medium rounded-md border transition-colors shrink-0 whitespace-nowrap ${
              isLight
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border-zinc-700/60'
            }`}
            title={isPhoneFrame ? '切换为自适应宽屏模式' : '切换为安卓手机预览模式'}
          >
            {isPhoneFrame ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-[11px] whitespace-nowrap leading-none hidden min-[440px]:inline">宽屏</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-[11px] whitespace-nowrap leading-none hidden min-[440px]:inline">手机</span>
              </>
            )}
          </button>

          {/* Android Installation Help */}
          <button
            id="install-guide-btn"
            onClick={onOpenInstallGuide}
            className={`h-7 w-7 flex items-center justify-center rounded-md border transition-colors shrink-0 ${
              isLight
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-300'
                : 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 border-zinc-700/60'
            }`}
            title="安卓安装为App说明"
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600 shrink-0" />
          </button>

          {hasImages && (
            <>
              <button
                id="clear-all-photos-btn"
                onClick={onClearAll}
                className={`h-7 w-7 flex items-center justify-center rounded-md border transition-colors shrink-0 ${
                  isLight
                    ? 'bg-zinc-100 hover:bg-red-50 text-zinc-500 hover:text-red-500 border-zinc-300'
                    : 'bg-zinc-800/90 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border-zinc-700/60'
                }`}
                title="清空当前照片"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
              </button>

              <button
                id="export-photos-header-btn"
                onClick={onExport}
                className="h-7 flex items-center justify-center gap-1 px-2 sm:px-2.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all active:scale-95 shrink-0 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] whitespace-nowrap leading-none">导出 ({imageCount})</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

