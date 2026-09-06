import React, { useRef } from 'react';
import { Plus, X, Layers } from 'lucide-react';
import { ImageFileItem, AppTheme } from '../types';

interface ThumbnailsBarProps {
  images: ImageFileItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onRemoveImage: (id: string) => void;
  onAddFiles: (files: FileList | File[]) => void;
  theme?: AppTheme;
}

export const ThumbnailsBar: React.FC<ThumbnailsBarProps> = ({
  images,
  selectedIndex,
  onSelectIndex,
  onRemoveImage,
  onAddFiles,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (images.length === 0) return null;

  return (
    <div
      className={`w-full border-t px-2.5 py-1.5 flex items-center gap-2 overflow-x-auto select-none transition-colors duration-200 ${
        isLight ? 'bg-zinc-100/95 border-zinc-200 text-zinc-700' : 'bg-zinc-900/95 border-zinc-800 text-zinc-300'
      }`}
    >
      <div
        className={`flex items-center gap-1 text-[11px] pl-0.5 pr-2 font-mono border-r shrink-0 ${
          isLight ? 'text-zinc-500 border-zinc-300' : 'text-zinc-400 border-zinc-800'
        }`}
      >
        <Layers className="w-3 h-3 text-blue-500" />
        <span>
          {selectedIndex + 1}/{images.length}
        </span>
      </div>

      {/* Thumbnails list */}
      <div className="flex items-center gap-1.5">
        {images.map((img, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={img.id}
              onClick={() => onSelectIndex(idx)}
              className={`relative group shrink-0 w-10 h-10 rounded-md overflow-hidden cursor-pointer transition-all border ${
                isSelected
                  ? 'ring-2 ring-blue-500 border-transparent shadow-sm'
                  : isLight
                  ? 'border-zinc-300 opacity-80 hover:opacity-100 hover:border-zinc-400'
                  : 'border-zinc-700/80 opacity-70 hover:opacity-100 hover:border-zinc-500'
              }`}
            >
              <img
                src={img.objectUrl}
                alt={img.name}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] font-mono text-zinc-300 px-1 rounded-tl">
                {idx + 1}
              </span>
              {/* Delete single button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveImage(img.id);
                }}
                className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/80 text-zinc-300 hover:text-red-400 hover:bg-black transition-colors opacity-0 group-hover:opacity-100"
                title="删除这张照片"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}

        {/* Add more button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAddFiles(e.target.files);
            }
          }}
        />
        <button
          id="add-more-photos-thumbnail-btn"
          onClick={() => fileInputRef.current?.click()}
          className={`shrink-0 w-10 h-10 rounded-md border border-dashed flex flex-col items-center justify-center gap-0 transition-colors ${
            isLight
              ? 'border-zinc-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 text-zinc-500 hover:text-blue-600'
              : 'border-zinc-700 hover:border-blue-400/80 bg-zinc-800/40 hover:bg-blue-950/20 text-zinc-400 hover:text-blue-300'
          }`}
          title="添加更多照片"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[8px] font-mono">添加</span>
        </button>
      </div>
    </div>
  );
};

