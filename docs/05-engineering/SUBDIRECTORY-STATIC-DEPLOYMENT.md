# 子目录静态部署

ClassIn PC 与独立 TeacherIn 可以从同一份 Vite 静态构建部署到站点子目录。构建时必须同时设置 Vite `base`、React Router `basename`、公共品牌资源路径和 Web App Manifest 范围，不能只把根目录构建产物移动到子目录。

## `/classin-newstruc/` 构建

```bash
npm run typecheck
npx vite build --base=/classin-newstruc/
```

生成的 `dist/` 内容应上传到站点根目录下的 `classin-newstruc/`：

```text
<站点根目录>/
└── classin-newstruc/
    ├── index.html
    ├── assets/
    ├── brand/
    └── manifest.webmanifest
```

入口地址：

- ClassIn PC 与站内 TeacherIn：`/classin-newstruc/`
- 独立 ToT TeacherIn：`/classin-newstruc/teachbuddy`

## SPA 回退

服务器必须将 `/classin-newstruc/` 下未命中真实文件的请求回退到 `/classin-newstruc/index.html`，使页面刷新和深层链接保持可用。Nginx 示例：

```nginx
location = /classin-newstruc {
  return 301 /classin-newstruc/;
}

location /classin-newstruc/ {
  try_files $uri $uri/ /classin-newstruc/index.html;
}
```

根目录构建仍使用 `npm run build`，其路径与行为不受子目录构建影响。
