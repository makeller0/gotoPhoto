import React, { useRef, useState, useEffect } from 'react';
import {
  Type,
  Grid3X3,
  Bookmark,
  Stamp,
  Upload,
  Check,
  Calendar,
  Clock,
  Plus,
  Trash2,
  BookmarkPlus,
  X,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { WatermarkConfig, PositionAnchor, WatermarkPreset, AppTheme } from '../types';
import {
  WATERMARK_PRESETS,
  BUILTIN_STAMPS,
  formatCurrentTimestampWithSeconds,
  loadCustomPresets,
  saveCustomPresetToStorage,
  deleteCustomPresetFromStorage,
  fileToOptimizedDataUrl,
} from '../data/presets';

interface WatermarkControlPanelProps {
  config: WatermarkConfig;
  onUpdateConfig: (partial: Partial<WatermarkConfig>) => void;
  onApplyPreset: (preset: WatermarkPreset) => void;
  theme?: AppTheme;
}

const COLOR_SWATCHES = [
  { name: '警示红', value: '#dc2626' },
  { name: '商务蓝', value: '#2563eb' },
  { name: '纯净白', value: '#ffffff' },
  { name: '玄武黑', value: '#18181b' },
  { name: '高光黄', value: '#eab308' },
  { name: '暗沉灰', value: '#64748b' },
  { name: '防伪绿', value: '#16a34a' },
];

const POSITION_ANCHORS: { anchor: PositionAnchor; label: string }[] = [
  { anchor: 'top-left', label: '左上' },
  { anchor: 'top-center', label: '中上' },
  { anchor: 'top-right', label: '右上' },
  { anchor: 'center-left', label: '左中' },
  { anchor: 'center', label: '居中' },
  { anchor: 'center-right', label: '右中' },
  { anchor: 'bottom-left', label: '左下' },
  { anchor: 'bottom-center', label: '中下' },
  { anchor: 'bottom-right', label: '右下' },
];

const QUICK_TEXT_TAGS = ['办理租房使用', '银行开户专供', '求职登记专用', '办理宽带业务', '购车过户使用'];

export const WatermarkControlPanel: React.FC<WatermarkControlPanelProps> = ({
  config,
  onUpdateConfig,
  onApplyPreset,
  theme = 'dark',
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isLight = theme === 'light';

  // Custom presets list
  const [customPresets, setCustomPresets] = useState<WatermarkPreset[]>([]);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');

  useEffect(() => {
    setCustomPresets(loadCustomPresets());
  }, []);

  // Tab definitions
  const tabs = [
    { id: 'presets', label: '常用预设', icon: Bookmark },
    { id: 'text', label: '文字水印', icon: Type },
    { id: 'tile', label: '全屏平铺', icon: Grid3X3 },
    { id: 'image', label: '图片图章', icon: Stamp },
  ];

  // Active sub-tab state (or driven by config.mode)
  const [activeTab, setActiveTab] = useState<'presets' | 'text' | 'tile' | 'image'>(
    config.mode === 'tile' ? 'tile' : config.mode === 'image' ? 'image' : 'text'
  );

  const handleTabChange = (tabId: 'presets' | 'text' | 'tile' | 'image') => {
    setActiveTab(tabId);
    if (tabId === 'tile') {
      onUpdateConfig({ mode: 'tile' });
    } else if (tabId === 'text') {
      onUpdateConfig({ mode: 'text' });
    } else if (tabId === 'image') {
      onUpdateConfig({ mode: 'image' });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Convert to persistent base64 data URL with max dimension to allow permanent storage in presets
      const dataUrl = await fileToOptimizedDataUrl(file, 512);
      onUpdateConfig({
        mode: 'image',
        imageLogoUrl: dataUrl,
        presetStampId: undefined,
      });
    } catch (err) {
      console.warn('Fallback to object URL for logo:', err);
      const url = URL.createObjectURL(file);
      onUpdateConfig({
        mode: 'image',
        imageLogoUrl: url,
        presetStampId: undefined,
      });
    }
  };

  // Insert current timestamp exact to the second
  const insertCurrentDateTime = (prefix: string = '现场记录') => {
    const fullText = formatCurrentTimestampWithSeconds(prefix);
    onUpdateConfig({ text: fullText });
  };

  // Save current watermark settings as custom preset
  const handleSaveCurrentAsPreset = () => {
    let defaultName = '我的水印预设';
    if (config.mode === 'image') {
      defaultName = config.imageLogoUrl ? '图片Logo水印预设' : '官方印章预设';
    } else if (config.text && config.text.length < 15) {
      defaultName = config.text;
    } else {
      defaultName = `${config.mode === 'tile' ? '全屏平铺' : '文字'}水印预设`;
    }
    setPresetNameInput(defaultName);
    setIsSavingPreset(true);
  };

  const confirmSavePreset = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName =
      presetNameInput.trim() ||
      (config.mode === 'image' ? '我的图片水印预设' : '我的专属水印预设');

    const desc =
      config.mode === 'image'
        ? config.imageLogoUrl
          ? `自定图片Logo · 缩放 ${Math.round(config.imageScale * 100)}% · 透明度 ${Math.round(config.opacity * 100)}%`
          : `内置印章 · 缩放 ${Math.round(config.imageScale * 100)}%`
        : config.mode === 'tile'
        ? `全屏倾斜平铺 · 文本: "${config.text.slice(0, 18)}"`
        : `单行位置定位 · 文本: "${config.text.slice(0, 18)}"`;

    const newPreset: WatermarkPreset = {
      id: `custom-${Date.now()}`,
      name: finalName,
      description: desc,
      tag: config.mode === 'image' ? '图片水印' : '自定义',
      isCustom: true,
      createdAt: Date.now(),
      config: { ...config },
    };
    const updated = saveCustomPresetToStorage(newPreset);
    setCustomPresets(updated);
    setIsSavingPreset(false);
    setPresetNameInput('');
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要删除此自定义预设吗？')) {
      const updated = deleteCustomPresetFromStorage(id);
      setCustomPresets(updated);
    }
  };

  return (
    <div
      className={`w-full border-t flex flex-col select-none transition-colors duration-200 ${
        isLight
          ? 'bg-white border-zinc-200 text-zinc-800'
          : 'bg-zinc-900 border-zinc-800 text-zinc-300'
      }`}
    >
      {/* Segmented Tab Bar */}
      <div
        className={`grid grid-cols-4 p-0.5 border-b ${
          isLight ? 'bg-zinc-100/90 border-zinc-200' : 'bg-zinc-950/80 border-zinc-800'
        }`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-md text-[11px] font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : isLight
                  ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Control Details Content */}
      <div className="p-2.5 sm:p-3 max-h-[40vh] sm:max-h-[34vh] overflow-y-auto space-y-2.5 text-xs">
        {/* TAB 1: PRESETS */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            {/* Header with Save Button */}
            <div className="flex items-center justify-between">
              <span className={`font-medium text-[11px] ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                预设管理与一键套用
              </span>
              <button
                id="save-current-preset-header-btn"
                onClick={handleSaveCurrentAsPreset}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-500 hover:text-blue-400 py-0.5 px-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all active:scale-98"
              >
                <BookmarkPlus className="w-3 h-3" />
                <span>保存当前为新预设</span>
              </button>
            </div>

            {/* Custom Presets Section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className={`font-bold flex items-center gap-1 ${isLight ? 'text-zinc-900' : 'text-zinc-200'}`}>
                  ⭐ 我的自定义预设
                  <span className="text-[10px] font-mono text-zinc-500">({customPresets.length})</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-500">永久保存在本地</span>
              </div>

              {customPresets.length === 0 ? (
                <div
                  className={`p-3 rounded-lg border border-dashed text-center text-[11px] ${
                    isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-500' : 'bg-zinc-950/60 border-zinc-800 text-zinc-500'
                  }`}
                >
                  <p>暂无自定义预设。调整好文字、位置或颜色后，点击右上角「保存当前为新预设」即可收藏！</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {customPresets.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => {
                        onApplyPreset(preset);
                        if (preset.config.mode === 'tile') setActiveTab('tile');
                        else if (preset.config.mode === 'image') setActiveTab('image');
                        else setActiveTab('text');
                      }}
                      className={`p-2 rounded-lg border transition-all text-left flex flex-col gap-0.5 cursor-pointer relative group ${
                        isLight
                          ? 'bg-zinc-50 hover:bg-blue-50/40 border-zinc-200 hover:border-blue-400'
                          : 'bg-zinc-950/80 hover:bg-zinc-800/80 border-zinc-800 hover:border-blue-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between pr-5">
                        <span className={`font-bold text-xs truncate ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
                          {preset.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1 py-0.2 rounded font-medium shrink-0 border ${
                            preset.config.mode === 'image'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : preset.config.mode === 'tile'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }`}
                        >
                          {preset.config.mode === 'image'
                            ? '图片'
                            : preset.config.mode === 'tile'
                            ? '平铺'
                            : '文字'}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate leading-tight">
                        {preset.description}
                      </p>
                      {preset.config.mode === 'image' && preset.config.imageLogoUrl ? (
                        <div
                          className={`mt-0.5 flex items-center gap-1.5 px-1.5 py-0.5 rounded border ${
                            isLight
                              ? 'bg-white text-zinc-700 border-zinc-200'
                              : 'bg-zinc-900 text-zinc-300 border-zinc-800/80'
                          }`}
                        >
                          <div className="w-4 h-4 shrink-0 rounded bg-zinc-800/20 border border-zinc-700/30 flex items-center justify-center overflow-hidden">
                            <img
                              src={preset.config.imageLogoUrl}
                              alt="Logo"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span className="font-mono text-[9px] truncate">
                            自定图片Logo · 缩放 {Math.round((preset.config.imageScale || 0.25) * 100)}%
                          </span>
                        </div>
                      ) : (
                        <div
                          className={`mt-0.5 font-mono text-[9px] truncate px-1.5 py-0.5 rounded border ${
                            isLight
                              ? 'bg-white text-zinc-700 border-zinc-200'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800/80'
                          }`}
                        >
                          {preset.config.text || '自定义水印配置'}
                        </div>
                      )}

                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                        className="absolute top-1.5 right-1.5 p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                        title="删除预设"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Built-in Presets Section */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className={`font-bold ${isLight ? 'text-zinc-900' : 'text-zinc-200'}`}>
                  📌 官方防盗与现场推荐预设
                </span>
                <span className="text-[10px] font-mono text-blue-500">点击即刻套用</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {WATERMARK_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    id={`preset-${preset.id}`}
                    onClick={() => {
                      onApplyPreset(preset);
                      if (preset.config.mode === 'tile') setActiveTab('tile');
                      else setActiveTab('text');
                    }}
                    className={`p-2 rounded-lg border transition-all text-left flex flex-col gap-0.5 active:scale-98 ${
                      isLight
                        ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 hover:border-blue-400'
                        : 'bg-zinc-950/80 hover:bg-zinc-800/80 border-zinc-800 hover:border-blue-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold text-xs ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
                        {preset.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                        {preset.tag}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                      {preset.description}
                    </p>
                    <div
                      className={`mt-0.5 font-mono text-[9px] truncate px-1.5 py-0.5 rounded border ${
                        isLight ? 'bg-white text-zinc-600 border-zinc-200' : 'bg-zinc-900 text-zinc-400 border-zinc-800/80'
                      }`}
                    >
                      {preset.config.text}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEXT WATERMARK */}
        {activeTab === 'text' && (
          <div className="space-y-2.5">
            {/* Text Input & Quick Second-Precision Timestamps */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className={`font-semibold text-[11px] ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>
                  水印文字内容
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => insertCurrentDateTime('现场实况')}
                    className="flex items-center gap-1 text-[10px] font-mono text-amber-500 hover:text-amber-400 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
                    title="插入包含秒数的实况时间戳 (YYYY-MM-DD HH:mm:ss)"
                  >
                    <Clock className="w-2.5 h-2.5" />
                    <span>秒级时间戳</span>
                  </button>
                  <button
                    onClick={handleSaveCurrentAsPreset}
                    className="flex items-center gap-1 text-[10px] font-mono text-blue-500 hover:text-blue-400 font-medium bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20"
                    title="将当前文字、颜色、位置等参数存为预设"
                  >
                    <BookmarkPlus className="w-2.5 h-2.5" />
                    <span>存为预设</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  id="watermark-text-input"
                  type="text"
                  value={config.text}
                  onChange={(e) => onUpdateConfig({ mode: 'text', text: e.target.value })}
                  placeholder="请输入水印文本，如：现场巡检 2026-09-06 14:20:35"
                  className={`w-full rounded-md px-2.5 py-1.5 text-xs focus:outline-none transition-colors border ${
                    isLight
                      ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-blue-600 focus:bg-white'
                      : 'bg-zinc-950 border-zinc-700/80 text-zinc-100 placeholder-zinc-500 focus:border-blue-500'
                  }`}
                />
              </div>

              {/* Exact Seconds Timestamp Quick Chips */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
                <span className="text-[10px] text-zinc-500 shrink-0 font-mono">秒级模版:</span>
                <button
                  onClick={() => insertCurrentDateTime('现场实况')}
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                    isLight
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border-amber-700/40'
                  }`}
                >
                  现场实况+秒
                </button>
                <button
                  onClick={() => insertCurrentDateTime('巡检打卡')}
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                    isLight
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border-amber-700/40'
                  }`}
                >
                  巡检打卡+秒
                </button>
                {QUICK_TEXT_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() =>
                      onUpdateConfig({
                        mode: 'text',
                        text: `仅供${tag} 他用无效`,
                      })
                    }
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                      isLight
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                        : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700/50'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Position 9-Grid & Custom Coordinate */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={`font-semibold text-[11px] ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>
                  位置锚点
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {config.position === 'custom'
                    ? `自定义坐标 (${config.customX}%, ${config.customY}%)`
                    : '九宫格固定位置'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 max-w-xs">
                {POSITION_ANCHORS.map((item) => (
                  <button
                    key={item.anchor}
                    onClick={() => onUpdateConfig({ position: item.anchor })}
                    className={`py-1 rounded text-[11px] font-medium transition-all ${
                      config.position === item.anchor
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : isLight
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
                        : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Swatches */}
            <div className="space-y-1">
              <span className={`font-semibold text-[11px] ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>
                字体颜色
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.value}
                    onClick={() => onUpdateConfig({ color: swatch.value })}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                      config.color === swatch.value
                        ? 'ring-2 ring-blue-500 scale-110 border-white'
                        : isLight
                        ? 'border-zinc-300 hover:scale-105'
                        : 'border-zinc-700 hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch.value }}
                    title={swatch.name}
                  >
                    {config.color === swatch.value && (
                      <Check
                        className={`w-3 h-3 ${
                          swatch.value === '#ffffff' ? 'text-black' : 'text-white'
                        }`}
                      />
                    )}
                  </button>
                ))}
                {/* Custom Color Input */}
                <input
                  type="color"
                  value={config.color}
                  onChange={(e) => onUpdateConfig({ color: e.target.value })}
                  className="w-6 h-6 rounded-full border border-zinc-400 bg-transparent cursor-pointer"
                  title="拾取任意颜色"
                />
              </div>
            </div>

            {/* Sliders: Size, Opacity, Rotation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Font Size */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className={isLight ? 'text-zinc-700' : 'text-zinc-300'}>字号比例</span>
                  <span className="font-mono text-zinc-500">
                    {Math.round(config.fontSizeRatio * 1000)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.015"
                  max="0.09"
                  step="0.002"
                  value={config.fontSizeRatio}
                  onChange={(e) => onUpdateConfig({ fontSizeRatio: parseFloat(e.target.value) })}
                  className={`w-full accent-blue-500 h-1 rounded cursor-pointer ${
                    isLight ? 'bg-zinc-200' : 'bg-zinc-800'
                  }`}
                />
              </div>

              {/* Opacity */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className={isLight ? 'text-zinc-700' : 'text-zinc-300'}>不透明度</span>
                  <span className="font-mono text-zinc-500">
                    {Math.round(config.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={config.opacity}
                  onChange={(e) => onUpdateConfig({ opacity: parseFloat(e.target.value) })}
                  className={`w-full accent-blue-500 h-1 rounded cursor-pointer ${
                    isLight ? 'bg-zinc-200' : 'bg-zinc-800'
                  }`}
                />
              </div>

              {/* Rotation */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className={isLight ? 'text-zinc-700' : 'text-zinc-300'}>旋转角度</span>
                  <span className="font-mono text-zinc-500">{config.rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="5"
                  value={config.rotation}
                  onChange={(e) => onUpdateConfig({ rotation: parseInt(e.target.value, 10) })}
                  className={`w-full accent-blue-500 h-1 rounded cursor-pointer ${
                    isLight ? 'bg-zinc-200' : 'bg-zinc-800'
                  }`}
                />
              </div>
            </div>

            {/* Style Toggles */}
            <div className={`flex items-center gap-3 pt-0.5 text-[11px] ${isLight ? 'text-zinc-800' : 'text-zinc-300'}`}>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.bold}
                  onChange={(e) => onUpdateConfig({ bold: e.target.checked })}
                  className="rounded accent-blue-500 w-3.5 h-3.5"
                />
                <span>粗体加重</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.hasShadow}
                  onChange={(e) => onUpdateConfig({ hasShadow: e.target.checked })}
                  className="rounded accent-blue-500 w-3.5 h-3.5"
                />
                <span>文字阴影</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.hasStroke}
                  onChange={(e) => onUpdateConfig({ hasStroke: e.target.checked })}
                  className="rounded accent-blue-500 w-3.5 h-3.5"
                />
                <span>清晰描边</span>
              </label>
            </div>
          </div>
        )}

        {/* TAB 3: TILE WATERMARK */}
        {activeTab === 'tile' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className={`font-semibold text-[11px] ${isLight ? 'text-zinc-900' : 'text-zinc-200'}`}>
                  全屏平铺防盗水印
                </span>
                <p className="text-[10px] text-zinc-500">
                  倾斜网格覆盖整张画面，防止局部截屏与他人冒用
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSaveCurrentAsPreset}
                  className="flex items-center gap-1 text-[10px] font-mono text-blue-500 hover:text-blue-400 font-medium bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20"
                  title="存为预设"
                >
                  <BookmarkPlus className="w-2.5 h-2.5" />
                  <span>存为预设</span>
                </button>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                  证件强防护
                </span>
              </div>
            </div>

            {/* Tile text input */}
            <div className="space-y-0.5">
              <label className={`text-[11px] ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>平铺文字</label>
              <input
                id="tile-watermark-text"
                type="text"
                value={config.text}
                onChange={(e) => onUpdateConfig({ mode: 'tile', text: e.target.value })}
                placeholder="仅供办理业务使用 他用无效"
                className={`w-full rounded-md px-2.5 py-1.5 text-xs focus:outline-none transition-colors border ${
                  isLight
                    ? 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-blue-600 focus:bg-white'
                    : 'bg-zinc-950 border-zinc-700/80 text-zinc-100 placeholder-zinc-500 focus:border-blue-500'
                }`}
              />
            </div>

            {/* Tile color palette */}
            <div className="space-y-0.5">
              <span className={`text-[11px] ${isLight ? 'text-zinc-700' : 'text-zinc-300'}`}>文字颜色</span>
              <div className="flex items-center gap-1.5">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.value}
                    onClick={() => onUpdateConfig({ mode: 'tile', color: swatch.value })}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                      config.color === swatch.value
                        ? 'ring-2 ring-blue-500 scale-110 border-white'
                        : isLight
                        ? 'border-zinc-300 hover:scale-105'
                        : 'border-zinc-700 hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch.value }}
                  >
                    {config.color === swatch.value && (
                      <Check
                        className={`w-3 h-3 ${
                          swatch.value === '#ffffff' ? 'text-black' : 'text-white'
                        }`}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tile Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Spacing / Density */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className={isLight ? 'text-zinc-700' : 'text-zinc-300'}>平铺间距</span>
                  <span className="font-mono text-zinc-500">
                    {config.tileSpacing <= 1.5 ? '密集' : config.tileSpacing >= 3.0 ? '稀疏' : '适中'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="4.0"
                  step="0.2"
                  value={config.tileSpacing}
                  onChange={(e) => onUpdateConfig({ mode: 'tile', tileSpacing: parseFloat(e.target.value) })}
                  className={`w-full accent-blue-500 h-1 rounded cursor-pointer ${
                    isLight ? 'bg-zinc-200' : 'bg-zinc-800'
                  }`}
                />
              </div>

              {/* Rotation Angle */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className={isLight ? 'text-zinc-700' : 'text-zinc-300'}>倾斜角度</span>
                  <span className="font-mono text-zinc-500">{config.rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="5"
                  value={config.rotation}
                  onChange={(e) => onUpdateConfig({ mode: 'tile', rotation: parseInt(e.target.value, 10) })}
                  className={`w-full accent-blue-500 h-1 rounded cursor-pointer ${
                    isLight ? 'bg-zinc-200' : 'bg-zinc-800'
                  }`}
                />
              </div>

              {/* Opacity */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className={isLight ? 'text-zinc-700' : 'text-zinc-300'}>水印透明度</span>
                  <span className="font-mono text-zinc-500">
                    {Math.round(config.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={config.opacity}
                  onChange={(e) => onUpdateConfig({ mode: 'tile', opacity: parseFloat(e.target.value) })}
                  className={`w-full accent-blue-500 h-1 rounded cursor-pointer ${
                    isLight ? 'bg-zinc-200' : 'bg-zinc-800'
                  }`}
                />
              </div>
            </div>

            {/* Staggered switch */}
            <div className={`flex items-center gap-3 pt-0.5 text-[11px] ${isLight ? 'text-zinc-800' : 'text-zinc-300'}`}>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isStaggered}
                  onChange={(e) => onUpdateConfig({ mode: 'tile', isStaggered: e.target.checked })}
                  className="rounded accent-blue-500 w-3.5 h-3.5"
                />
                <span>交错网格排列 (更难抹除)</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.hasStroke}
                  onChange={(e) => onUpdateConfig({ mode: 'tile', hasStroke: e.target.checked })}
                  className="rounded accent-blue-500 w-3.5 h-3.5"
                />
                <span>双重清晰描边</span>
              </label>
            </div>
          </div>
        )}

        {/* TAB 4: IMAGE & STAMPS */}
        {activeTab === 'image' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`font-semibold text-[11px] ${isLight ? 'text-zinc-900' : 'text-zinc-200'}`}>
                图片水印与官方印章
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">透明PNG / 个人签名 / 印章预设</span>
            </div>

            {/* Upload Logo Button / Active Logo Card */}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />

            {config.imageLogoUrl ? (
              <div
                className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                  isLight
                    ? 'bg-blue-50/50 border-blue-200 text-zinc-800'
                    : 'bg-blue-950/20 border-blue-800/60 text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-md bg-zinc-900/60 border border-zinc-700/60 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                    <img
                      src={config.imageLogoUrl}
                      alt="Current Watermark Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs truncate">已载入自定义图片水印</span>
                      <span className="text-[9px] px-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
                        就绪
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate">
                      缩放: {Math.round(config.imageScale * 100)}% · 透明度: {Math.round(config.opacity * 100)}% · 角度: {config.rotation}°
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id="save-image-as-preset-btn"
                    onClick={handleSaveCurrentAsPreset}
                    className="h-7 px-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>保存为预设</span>
                  </button>
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className={`h-7 px-2 rounded-md border text-xs font-medium transition-colors ${
                      isLight
                        ? 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                    }`}
                  >
                    更换
                  </button>
                  <button
                    onClick={() => onUpdateConfig({ imageLogoUrl: null, presetStampId: 'stamp-approved' })}
                    className="h-7 px-2 rounded-md bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 text-xs"
                    title="移除图片水印"
                  >
                    清除
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  id="upload-custom-logo-btn"
                  onClick={() => logoInputRef.current?.click()}
                  className={`h-8 flex-1 flex items-center justify-center gap-1.5 px-3 rounded-md border transition-colors text-xs font-medium shadow-xs ${
                    isLight
                      ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border-blue-800/60'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>上传自定义水印图片 (PNG透明图 / 签名 / 印章)</span>
                </button>
              </div>
            )}

            {/* Saved Image Watermarks Collection */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className={`font-bold flex items-center gap-1 ${isLight ? 'text-zinc-900' : 'text-zinc-200'}`}>
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>我的已存图片水印库</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    ({customPresets.filter((p) => p.config.mode === 'image').length})
                  </span>
                </span>
                <span className="text-[10px] font-mono text-zinc-500">点击直接载入使用</span>
              </div>

              {customPresets.filter((p) => p.config.mode === 'image').length === 0 ? (
                <div
                  className={`p-2.5 rounded-lg border border-dashed text-center text-[10px] ${
                    isLight
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-500'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-500'
                  }`}
                >
                  暂无已保存的图片水印预设。上传公司Logo、防伪印章或透明签名后，点击「保存为预设」即可永久留存！
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {customPresets
                    .filter((p) => p.config.mode === 'image')
                    .map((preset) => {
                      const isCurrentActive =
                        config.mode === 'image' &&
                        Boolean(preset.config.imageLogoUrl && config.imageLogoUrl === preset.config.imageLogoUrl);
                      return (
                        <div
                          key={preset.id}
                          onClick={() => {
                            onApplyPreset(preset);
                            setActiveTab('image');
                          }}
                          className={`p-2 rounded-lg border transition-all text-left flex items-center justify-between gap-2 cursor-pointer relative group ${
                            isCurrentActive
                              ? 'ring-2 ring-blue-500 bg-blue-500/10 border-blue-500'
                              : isLight
                              ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'
                              : 'bg-zinc-950/80 hover:bg-zinc-800/80 border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded bg-zinc-900/60 border border-zinc-700/40 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                              {preset.config.imageLogoUrl ? (
                                <img
                                  src={preset.config.imageLogoUrl}
                                  alt="Logo"
                                  className="max-w-full max-h-full object-contain"
                                />
                              ) : (
                                <Stamp className="w-3.5 h-3.5 text-blue-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span
                                className={`font-bold text-xs truncate block ${
                                  isLight ? 'text-zinc-900' : 'text-zinc-100'
                                }`}
                              >
                                {preset.name}
                              </span>
                              <span className="text-[9px] font-mono text-zinc-500 block truncate">
                                缩放 {Math.round((preset.config.imageScale || 0.25) * 100)}% · 透明度 {Math.round((preset.config.opacity || 0.5) * 100)}%
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isCurrentActive && (
                              <span className="text-[9px] font-mono px-1 rounded bg-blue-500 text-white font-semibold">
                                使用中
                              </span>
                            )}
                            <button
                              onClick={(e) => handleDeletePreset(preset.id, e)}
                              className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                              title="删除此预设"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Built-in Official Vector Stamps */}
            <div className="space-y-1 pt-1">
              <span className="text-zinc-500 text-[11px]">内置官方电子印章</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {BUILTIN_STAMPS.map((stamp) => {
                  const isSelected =
                    !config.imageLogoUrl && config.presetStampId === stamp.id;
                  return (
                    <button
                      key={stamp.id}
                      onClick={() =>
                        onUpdateConfig({
                          mode: 'image',
                          imageLogoUrl: null,
                          presetStampId: stamp.id,
                        })
                      }
                      className={`p-1.5 rounded-md border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'ring-2 ring-blue-500 bg-blue-500/10 border-blue-500'
                          : isLight
                          ? 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                          : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div
                        className="px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider border"
                        style={{
                          color: stamp.color,
                          borderColor: stamp.borderColor,
                          backgroundColor: `${stamp.color}15`,
                        }}
                      >
                        {stamp.name}
                      </div>
                      <span className="text-[8px] font-mono text-zinc-500 tracking-tight">
                        {stamp.enName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Image / Stamp Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className={isLight ? 'text-zinc-700' : 'text-zinc-300'}>大小缩放</span>
                  <span className="font-mono text-zinc-500">
                    {Math.round(config.imageScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.7"
                  step="0.05"
                  value={config.imageScale}
                  onChange={(e) => onUpdateConfig({ mode: 'image', imageScale: parseFloat(e.target.value) })}
                  className={`w-full accent-blue-500 h-1 rounded cursor-pointer ${
                    isLight ? 'bg-zinc-200' : 'bg-zinc-800'
                  }`}
                />
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className={isLight ? 'text-zinc-700' : 'text-zinc-300'}>不透明度</span>
                  <span className="font-mono text-zinc-500">
                    {Math.round(config.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.opacity}
                  onChange={(e) => onUpdateConfig({ mode: 'image', opacity: parseFloat(e.target.value) })}
                  className={`w-full accent-blue-500 h-1 rounded cursor-pointer ${
                    isLight ? 'bg-zinc-200' : 'bg-zinc-800'
                  }`}
                />
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className={isLight ? 'text-zinc-700' : 'text-zinc-300'}>印章旋转</span>
                  <span className="font-mono text-zinc-500">{config.rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="5"
                  value={config.rotation}
                  onChange={(e) => onUpdateConfig({ mode: 'image', rotation: parseInt(e.target.value, 10) })}
                  className={`w-full accent-blue-500 h-1 rounded cursor-pointer ${
                    isLight ? 'bg-zinc-200' : 'bg-zinc-800'
                  }`}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Preset Dialog Modal */}
      {isSavingPreset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-sm rounded-xl p-4 shadow-2xl border space-y-3 ${
              isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/40">
              <div className="flex items-center gap-1.5">
                <BookmarkPlus className="w-4 h-4 text-blue-500" />
                <h4 className="font-bold text-sm">保存为自定义水印预设</h4>
              </div>
              <button
                onClick={() => setIsSavingPreset(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={confirmSavePreset} className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">预设名称 (例如：租房签约专用、实况巡检打卡)</label>
                <input
                  type="text"
                  autoFocus
                  value={presetNameInput}
                  onChange={(e) => setPresetNameInput(e.target.value)}
                  placeholder="请输入预设名称"
                  className={`w-full rounded-md px-2.5 py-1.5 text-xs focus:outline-none border ${
                    isLight
                      ? 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-blue-600'
                      : 'bg-zinc-950 border-zinc-700 text-zinc-100 focus:border-blue-500'
                  }`}
                />
              </div>

              <div
                className={`p-2.5 rounded-md text-[10px] font-mono space-y-1.5 border ${
                  isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>模式：{config.mode === 'tile' ? '全屏平铺' : config.mode === 'image' ? '图片水印 / 印章' : '单条文字'}</span>
                  <span>透明度: {Math.round(config.opacity * 100)}%</span>
                </div>

                {config.mode === 'image' ? (
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="w-8 h-8 rounded bg-zinc-900/60 border border-zinc-700/60 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                      {config.imageLogoUrl ? (
                        <img
                          src={config.imageLogoUrl}
                          alt="Logo Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <Stamp className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div className="text-[10px]">
                      <div className="text-zinc-300 font-sans font-medium">
                        {config.imageLogoUrl ? '已包含自定义图片源数据' : '内置官方电子印章'}
                      </div>
                      <div className="text-zinc-500 font-mono">
                        缩放 {Math.round(config.imageScale * 100)}% · 角度 {config.rotation}°
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="truncate">文字：{config.text || '(无文字)'}</div>
                    <div>颜色：{config.color} · 描边: {config.hasStroke ? '开启' : '关闭'}</div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSavingPreset(false)}
                  className={`flex-1 h-8 rounded-md text-xs font-medium border ${
                    isLight
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  }`}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 h-8 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  确认保存预设
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
