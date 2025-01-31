/* test_slack.js */
const fetch = require('node-fetch');

// Slack Webhook URL は Secrets などで設定
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

/**
 * Slackメッセージを組み立てる関数
 * - URLをメッセージ本体(text)に書いてプレビューを促す
 * - Block Kitで見出しテキスト・ボタン・URL表示
 */
function createSlackBlockMessageForTest() {
  // テスト用のツイートURL (末尾に?test=123を付与してプレビュー再取得狙い)
  const testTweetUrl = 'https://x.com/googlesearchc/status/1873848143168889194?test=123';

  return {
    text: testTweetUrl, // Slackがここを検知してプレビュー
    unfurl_links: true,
    unfurl_media: true,

    blocks: [
      // 見出しテキスト
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\n\n:loudspeaker: Google Search Central のXアカウントが更新されました!!\n\n｜Google Search Central's X account has been updated!!`
        }
      },
      // ボタン
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'X(Twitter)で詳細を見る' },
            url: testTweetUrl
          }
        ]
      },
      // ボタンの下に1行空けてURLを表示
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\n｜URL: ${testTweetUrl}`
        }
      }
    ]
  };
}

async function postTestMessageToSlack() {
  const payload = createSlackBlockMessageForTest();

  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Slack Webhook error: ${response.status} ${response.statusText}`);
  }
  console.log('✅ テストメッセージをSlackに送信しました。');
}

// 実行
(async function main() {
  try {
    if (!SLACK_WEBHOOK_URL) {
      console.error('環境変数 SLACK_WEBHOOK_URL が設定されていません。');
      process.exit(1);
    }
    await postTestMessageToSlack();
    process.exit(0);
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
})();
