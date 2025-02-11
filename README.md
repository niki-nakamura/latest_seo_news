# latest_seo_news

このリポジトリは、Google Search Central の X アカウント（旧 Twitter）の最新ツイートを定期的に監視し、新しいツイートがあった場合に Slack へ通知する GitHub Actions ワークフローを提供します。

## 概要

- **監視対象:** Google Search Central の X アカウント
- **通知先:** Slack（Block Kit を利用してリンクのプレビュー表示）
- **更新頻度:** 30 分おきに最新ツイートをチェック
- **記録:** 最新のツイートIDを `latest_tweet_id.json` に保存し、変更があれば自動でコミット・プッシュ

## セットアップ

1. **リポジトリのクローンまたはフォーク**  
   このリポジトリを自身のアカウントにクローンしてください。

2. **GitHub Secrets の設定**  
   GitHub のリポジトリ設定に移動し、以下のシークレットを追加してください:
   - `SLACK_WEBHOOK_URL`: Slack の Incoming Webhook URL
   - `TWITTER_BEARER_TOKEN`: Twitter API の Bearer Token

3. **ワークフローの権限設定**  
   `.github/workflows/tweet_monitor.yml` 内で `contents: write` の権限が付与されているため、ワークフロー実行時に `latest_tweet_id.json` が自動更新されます。

4. **依存関係**  
   Node.js (バージョン 18) と `node-fetch@2` が必要ですが、ワークフロー内で自動的にセットアップされます。

## ファイル構成

- **.github/workflows/tweet_monitor.yml**  
  GitHub Actions のワークフロー定義ファイル。30 分おきにツイートのチェックを行います。

- **latest_tweet_id.json**  
  最新のツイートIDを記録するファイル。ワークフロー実行時に更新されます。

- **monitor.js**  
  ツイート監視・Slack通知のメインスクリプト。

- **test_slack.js**  
  Slack 通知機能の動作確認用テストスクリプト。

## 注意事項

- **機密情報について**  
  コード内には機密情報は含まれておらず、認証情報は GitHub Secrets で安全に管理されています。  
  ※ 過去のコミット履歴に認証情報が含まれていないかもご確認ください。

- **ファイルの自動作成について**  
  GitHub Actions は、`latest_tweet_id.json` の更新・コミット・プッシュを行いますが、これ以外に不必要なファイルを自動で作成する動作はありません。

## ライセンス

このプロジェクトは [MIT ライセンス](LICENSE) の下で公開されています。
