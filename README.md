# 📸 gotoPhoto

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/makeller0/gotoPhoto.svg)](https://github.com/makeller0/gotoPhoto/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/makeller0/gotoPhoto.svg)](https://github.com/makeller0/gotoPhoto/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/makeller0/gotoPhoto.svg)](https://github.com/makeller0/gotoPhoto/commits/main)

> **gotoPhoto** 是一个轻量、高效的照片快速检索与浏览工具，旨在帮助用户通过时间戳、EXIF 元数据、标签或目录层级快速直达并管理目标照片。

---

## ✨ 核心特性 (Features)

- ⚡ **快速定位 (Fast Navigation)**：支持按日期、拍摄时间轴、地理位置（GPS EXIF）一键跳转照片。
- 🔍 **智能检索 (Smart Filtering)**：根据相机参数（ISO、快门、焦段）、文件类型、自定义标签进行高效过滤。
- 🖼️ **极速预览 (Instant Thumbnail & Preview)**：轻量级缩略图缓存机制，海量图片秒级加载。
- 📂 **非侵入式管理 (Non-destructive)**：保留原始目录结构，不篡改原图文件与 EXIF 原始信息。
- 🛠️ **跨平台支持 (Cross-Platform)**：支持主流操作系统（Windows / macOS / Linux）。

---

## 🛠️ 技术栈 (Tech Stack)

<!-- 根据你的实际开发语言取消注释或修改 -->
- **核心语言**：Python / Go / TypeScript
- **前端/GUI**：React / Vue / Electron / PyQt
- **图像处理**：Pillow / OpenCV / Sharp
- **元数据解析**：ExifTool / piexif

---

## 📁 目录结构 (Directory Layout)

```text
gotoPhoto/
├── src/                  # 核心源代码
│   ├── api/              # API 或服务路由
│   ├── core/             # 照片扫描、EXIF 解析、索引核心逻辑
│   ├── ui/               # 用户界面或 CLI 交互逻辑
│   └── utils/            # 工具函数 (文件IO、缓存等)
├── assets/               # 静态资源、图标、预览图
├── tests/                # 单元测试与集成测试
├── config.example.json   # 配置文件模板
├── .gitignore
├── LICENSE
└── README.md
