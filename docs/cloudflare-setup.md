# Cloudflare セットアップ手順書

Shade は Cloudflare Workers 上で動作する Discord Bot です。本書では **Cloudflare 側**
のセットアップ（アカウント作成〜 Workers へのデプロイ〜運用）の手順のみをまとめます。
Discord アプリケーション側の作成手順は [README.md](../README.md) の「1. Create the
Discord application」を参照してください。

## 前提条件

- Node.js（`package.json` の devDependencies に準拠したバージョン。18 以降を推奨）
- npm
- Discord アプリケーションの作成が完了していること（`DISCORD_TOKEN` /
  `DISCORD_PUBLIC_KEY` / `DISCORD_APPLICATION_ID` を取得済みであること）

## 1. Cloudflare アカウントの作成

1. [Cloudflare](https://dash.cloudflare.com/sign-up) にアクセスし、アカウントを作成します。
2. 無料プランで問題ありません。Workers・KV とも無料枠内で本 Bot は運用できます
   （利用規模によっては [Workers の料金](https://developers.cloudflare.com/workers/platform/pricing/)
   を確認してください）。
3. ダッシュボードにログインできることを確認します。

## 2. 依存パッケージのインストール

リポジトリのルートで依存関係をインストールします。`wrangler`（Cloudflare の CLI）は
`devDependencies` に含まれているため、別途グローバルインストールする必要はありません。

```bash
npm install
```

## 3. wrangler から Cloudflare アカウントへログイン

```bash
npx wrangler login
```

ブラウザが開き、Cloudflare アカウントへのアクセス許可を求められます。許可すると
`wrangler` がローカルに認証情報を保存し、以降の `wrangler` コマンドがそのアカウントに
対して実行されるようになります。

ログイン状態は以下で確認できます。

```bash
npx wrangler whoami
```

## 4. KV Namespace の作成

Bot はロールメニューの紐付けを Cloudflare KV（`ROLE_MENUS` という binding 名）に保存します。
以下のコマンドで Namespace を作成します。

```bash
npx wrangler kv namespace create ROLE_MENUS
```

実行すると次のような出力が得られます。

```
[[kv_namespaces]]
binding = "ROLE_MENUS"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

この `id` の値を `wrangler.toml` の `id = "REPLACE_WITH_KV_NAMESPACE_ID"` の部分に
そのまま貼り付けてください。

```toml
[[kv_namespaces]]
binding = "ROLE_MENUS"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

> ローカル開発（`wrangler dev`）では自動的にローカルの KV エミュレーションが使われるため、
> この段階で `.dev.vars` 側に KV の設定を追加する必要はありません。

## 5. 環境変数（ローカル開発用）の設定

ローカル開発用に `.dev.vars` を作成し、Discord アプリケーションの認証情報を設定します。

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` を開き、以下を埋めます。

```
DISCORD_TOKEN=<Botトークン>
DISCORD_PUBLIC_KEY=<Public Key>
DISCORD_APPLICATION_ID=<Application ID>
DEV_GUILD_ID=<開発用サーバーのGuild ID（任意）>
```

`.dev.vars` は `.gitignore` により Git 管理対象外になっているため、誤ってコミットされる
心配はありません。

## 6. ローカルでの動作確認

```bash
npm run dev
```

`wrangler dev` がローカルで Worker を起動します。Discord からの Interaction を実際に
受け取るには、後述の「8. デプロイ」を先に行い、公開 URL を Discord 側に設定する必要が
あります（Discord は HTTPS で到達可能なエンドポイントにしか Interaction を送信できないため、
ローカル環境単体でのエンドツーエンドの検証はできません）。

型チェックとユニットテストは以下で実行できます。

```bash
npm run typecheck
npm test
```

## 7. スラッシュコマンドの登録

```bash
npm run register-commands
```

- `.dev.vars` に `DEV_GUILD_ID` を設定している場合、そのサーバーにのみ即時反映されます
  （開発中はこちらを推奨）。
- `DEV_GUILD_ID` が未設定の場合はグローバル登録となり、全サーバーへの反映までに最大1時間
  ほどかかることがあります。

## 8. Cloudflare Workers へのデプロイ

```bash
npm run deploy
```

内部的には `wrangler deploy` が実行され、`wrangler.toml` の `name`
（`shade-discord-bot`）を Worker 名として Cloudflare にアップロードされます。デプロイが
成功すると、以下のような URL が発行されます。

```
https://shade-discord-bot.<your-subdomain>.workers.dev
```

初回デプロイ時に Cloudflare 上の Workers サブドメイン（`<your-subdomain>`）が未設定の
場合は、Cloudflare ダッシュボードの **Workers & Pages** から設定を求められることがあります。

## 9. 本番環境用シークレットの設定

`.dev.vars` はローカル開発でのみ読み込まれ、デプロイされた Worker には反映されません。
本番の Worker には `wrangler secret put` で個別に設定します。

```bash
npx wrangler secret put DISCORD_TOKEN
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_APPLICATION_ID
```

各コマンド実行後、値の入力を求められるので該当する値を貼り付けます。設定済みの
シークレット一覧（値は表示されません）は以下で確認できます。

```bash
npx wrangler secret list
```

## 10. Discord 側に Interaction Endpoint URL を設定

Discord Developer Portal のアプリケーション設定画面で、**Interactions Endpoint URL** に
デプロイ済み Worker の URL + `/interactions` を設定します。

```
https://shade-discord-bot.<your-subdomain>.workers.dev/interactions
```

保存すると Discord から即座に検証用の PING が送信されます。Worker が正しくデプロイ・
シークレット設定済みであれば検証は自動的に成功します。失敗する場合は次の「トラブル
シューティング」を参照してください。

## 11. 独自ドメインを使う場合（任意）

`workers.dev` のサブドメインではなく独自ドメインで公開したい場合は、そのドメインを
Cloudflare の DNS で管理している状態で Worker に Route（または Custom Domain）を
割り当てます。

1. Cloudflare ダッシュボードでドメインを Cloudflare に追加し、ネームサーバーを
   Cloudflare のものに変更します。
2. **Workers & Pages** → 対象の Worker → **Settings** → **Domains & Routes** から
   Custom Domain を追加します。
3. 反映後、Interaction Endpoint URL をその独自ドメインの `/interactions` に変更します。

## 12. デプロイ後の運用

- **ログの確認**: リアルタイムでログを見たい場合は以下を利用します。

  ```bash
  npx wrangler tail
  ```

- **KV の中身を確認・操作**: 手動でロールメニューのデータを確認したい場合。

  ```bash
  npx wrangler kv key list --binding=ROLE_MENUS
  npx wrangler kv key get --binding=ROLE_MENUS "menu:<message_id>"
  ```

- **再デプロイ**: コードやシークレットを更新した場合は `npm run deploy` を再実行すれば
  上書きデプロイされます。ダウンタイムは基本的に発生しません。

## トラブルシューティング

| 症状 | 原因・対処 |
| --- | --- |
| Interaction Endpoint URL の検証が失敗する | Worker が未デプロイ、または `DISCORD_PUBLIC_KEY` のシークレットが未設定・値が誤っている可能性があります。`wrangler secret list` で設定状況を確認してください。 |
| `wrangler kv namespace create` が失敗する | `wrangler login` が済んでいない、またはアカウントの権限不足の可能性があります。`wrangler whoami` で認証状態を確認してください。 |
| ロールメニューの反映が遅い / 一部リージョンで反映されていない | Cloudflare KV は結果整合性（eventually consistent）であり、書き込みからグローバル反映まで最大 60 秒程度かかることがあります（README の「Known limitations」参照）。 |
| スラッシュコマンドがサーバーに表示されない | グローバル登録の場合は反映まで最大1時間かかります。開発中は `.dev.vars` に `DEV_GUILD_ID` を設定し、ギルド単位で即時登録することを推奨します。 |
| デプロイは成功するがロール付与が失敗する | Bot のロールが、付与・剥奪しようとしているロールより下位にある可能性があります。Discord のサーバー設定でロール階層を確認してください（README 参照）。 |

## 関連ドキュメント

- [README.md](../README.md) — Discord アプリケーション作成、アーキテクチャ、コマンド一覧
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare KV Docs](https://developers.cloudflare.com/kv/)
