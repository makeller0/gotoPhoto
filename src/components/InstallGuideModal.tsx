import React from 'react';
import { X, Smartphone, Check, ArrowRight, ShieldCheck, Download } from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-4 text-zinc-100 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">安卓 App 安装与离线使用指南</h3>
              <p className="text-[10px] text-zinc-400 font-mono">PWA 渐进式安卓原生独立应用</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps for Android */}
        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-zinc-200 text-xs">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono">
                1
              </span>
              <span>在安卓手机浏览器中打开</span>
            </div>
            <p className="text-zinc-400 pl-6 text-[11px] leading-relaxed">
              推荐使用 Android 原生 <strong>Chrome 浏览器</strong> 或 Edge、三星浏览器。
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-zinc-200 text-xs">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono">
                2
              </span>
              <span>点击浏览器右上角菜单「⋮」</span>
            </div>
            <p className="text-zinc-400 pl-6 text-[11px] leading-relaxed">
              在弹出的系统菜单中，点击 <strong>「安装应用」</strong> 或 <strong>「添加到主屏幕」</strong>。
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-zinc-200 text-xs">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono">
                3
              </span>
              <span>像原生安卓 App 一样随时启动</span>
            </div>
            <p className="text-zinc-400 pl-6 text-[11px] leading-relaxed">
              手机桌面将自动生成「水印添加器」独立图标，点击即可全屏极速启动，支持断网离线使用！
            </p>
          </div>

          {/* Advantages */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>零多余权限常驻</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>不占系统存储</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>离线运行，隐私安全</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>支持多图批量打包</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-1">
          <button
            onClick={onClose}
            className="w-full h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-sm transition-colors"
          >
            知道了，返回使用
          </button>
        </div>
      </div>
    </div>
  );
};
