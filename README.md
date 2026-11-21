# Dungeons & Dynasties 日本語攻略

Steam早期アクセスのギルド経営シミュレーション「Dungeons & Dynasties」の非公式・日本語攻略サイトのソースです。

## 構成

| 場所 | 中身 |
|---|---|
| `src/pages/<id>.html` | 各ページの本文。`<id>` がそのまま URL(`/<id>/`)になる。`top.html` はトップ(`/`) |
| `src/site.mjs` | 章とページの並び、ページの説明文 |
| `src/data/glossary.mjs` | 用語集のデータ(`G`)と分類(`CATS`) |
| `src/data/traits.mjs` | 特性のデータ(`TR`)と相性表の列(`TCOLS`) |
| `src/layout.html` | 全ページ共通の枠(ヘッダー・ナビ・フッター)。最終更新日もここ |
| `src/assets/` | 見た目(`style.css`)と画面の動き(`site.js`) |
| `site.config.json` | 公開URL、検索エンジンに載せるか、修正依頼フォーム、コメント欄(giscus)の設定 |
| `build.mjs` | 上をまとめて `dist/` に出力するスクリプト |

## ビルド

```sh
npm install
npm run build      # dist/ に出力
npm run preview    # ビルドして http://localhost:8080 で確認
```

ビルドすると、本文の `href="#ページid"` や `href="#見出しid"` は自動で正しい URL に書き換わります。リンク先が見つからないときや id が重複しているときは、ビルドの最後に「注意」として表示されます。

## 公開(Cloudflare Pages)

- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `dist`

## 設定(site.config.json)

- `siteUrl`: 公開URL(例 `https://xxx.pages.dev`)。入れると canonical と、公開時の sitemap.xml が出る
- `indexable`: `false` のあいだは全ページに `noindex` を付けて、検索エンジンに載せない
- `feedback.formUrl` / `feedback.pageEntry`: Googleフォームの URL と、ページ名を自動で入れる欄の `entry.番号`
- `giscus`: コメント欄の設定。`repoId`・`category`・`categoryId` は https://giscus.app で取得する。全部そろうと各ページの下にコメント欄が出る
