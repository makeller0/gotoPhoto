# 项目发布与开发规范 (Project Release & Development Guidelines)

## 版本更新规则 (Version Release Rules)
每次完成 release 或发布更新时，必须更新应用版本号：
- **小更新 (Minor update / bug fixes / UI tweaks)**: 版本编号增加 **0.1**（例如：`1.0` -> `1.1` -> `1.2`）。
- **大更新 (Major update / new features / structural changes)**: 版本编号增加 **1**（例如：`1.x` -> `2.0`）。

### 版本号同步维护位置：
1. `src/version.ts` 中的 `APP_VERSION` 常量
2. `package.json` 中的 `"version"` 字段
