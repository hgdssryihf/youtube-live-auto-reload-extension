# YouTube LIVE 自動リロード監視

指定した日時になったらタブを前面表示し、その後は一定間隔でYouTube LIVEの配信開始を確認しながら、まだ始まっていなければ自動でリロードするブラウザ拡張機能です。実際に再生が始まったら自動的に監視を停止します。

配信者側の開始が予定時刻より遅れる場合でも、配信が実際に始まったタイミングでリロードされるため、見逃しを防げます。

**ストアからインストール**:[Edge版]([https://microsoftedge.microsoft.com/addons/detail/%E5%B8%B8%E3%81%AB%E5%90%8D%E5%89%8D%E3%82%92%E4%BB%98%E3%81%91%E3%81%A6%E4%BF%9D%E5%AD%98/gpcbepkjdiomhiblenecabebcefkacnd])

## 対応ブラウザ

このリポジトリには、ブラウザごとに2つのバージョンが含まれています。

| フォルダ | 対応ブラウザ | ストアページ | 説明 |
|---|---|---|---|
| [`chrome-edge/`](./chrome-edge) | Google Chrome, Microsoft Edge | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/youtube-live-自動リロード監視/nbaphmmlaohmmkhjfnddokhjclcapmpa) | Manifest V3 (`chrome.*` API) |
| [`firefox/`](./firefox) | Mozilla Firefox | [Firefox Add-ons (AMO)](https://addons.mozilla.org/ja/firefox/addon/youtube-live-自動リロード監視/) | Manifest V3 (`browser.*` / WebExtensions API) |

それぞれのフォルダ内のREADMEに、インストール方法・使い方・注意点を記載しています。

## 主な機能

- 指定した日時になったら、対象タブを前面表示
- 一定間隔でタブの再生状態(`<video>`要素)を自動チェック
- まだ再生されていなければ、前面表示&リロードを繰り返す
- 再生開始を検知したら自動で監視を停止し、拡張機能アイコンに「LIVE」と表示
- 同じタブに対する監視予定は、新規追加ではなく上書き
- 「このタブを監視する」を押すとポップアップが自動的に閉じる

## インストール方法

### ストアから(推奨)

- **Firefox**: [Firefox Add-ons (AMO) のページ](https://addons.mozilla.org/ja/firefox/addon/youtube-live-自動リロード監視/)から「Firefoxへ追加」をクリック
- **Edge**: [Microsoft Edge Add-ons のページ](https://microsoftedge.microsoft.com/addons/detail/youtube-live-自動リロード監視/nbaphmmlaohmmkhjfnddokhjclcapmpa)から「入手」をクリック
- **Chrome**: Chromeウェブストアには現在未公開です。下記の「開発版・一時利用」の手順でインストールしてください

### 開発版・一時利用(コードを直接読み込む場合)

#### Chrome / Edge

1. `chrome-edge/` フォルダをダウンロードします
2. `chrome://extensions/`(Edgeの場合は `edge://extensions/`)を開きます
3. 「デベロッパーモード」(Edgeは「開発者モード」)をONにします
4. 「パッケージ化されていない拡張機能を読み込む」(Edgeは「展開して読み込み」)をクリックし、`chrome-edge/` フォルダを選択します

#### Firefox

1. `firefox/` フォルダをダウンロードします
2. `about:debugging#/runtime/this-firefox` を開きます
3. 「一時的なアドオンを読み込む...」をクリックし、`firefox/` フォルダ内の `manifest.json` を選択します

※ Firefoxで一時的に読み込んだアドオンは、Firefoxを再起動すると消えます。恒久的に使いたい場合や正式に配布したい場合は、各フォルダ内のREADMEを参照してください。

## ライセンス

[LICENSE](./LICENSE) を参照してください(MITライセンス)。必要に応じて変更してください。

## 更新履歴の管理について

このリポジトリをご自身のGitHubアカウントにアップロードした後は、コードを修正するたびに以下のような流れで管理できます。

```bash
git add .
git commit -m "変更内容の説明"
git push
```

ブラウザストア(Chromeウェブストア、Microsoft Edge アドオン、Firefox Add-ons)への提出は、リポジトリの更新とは別に、各ストアの開発者センターで手動アップロード(または各ストアのCLIツール)が必要です。
