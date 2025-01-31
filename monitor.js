/**
 * monitor.js
 *
 * 1. 前回取得した最新ツイートIDを JSON ファイルで保持
 * 2. Twitter API (v2) から最新のツイートを取得
 * 3. 新しいツイートがあれば Slack に通知 & JSON ファイルを更新
 */

const fs = require('fs');
const fetch = require('node-fetch');

// 取得した最新ツイートIDを保存するファイル
const LATEST_ID_FILE = './latest_tweet_id.json';

// Google Search Central (公式) アカウントのユーザーID
// たとえば「@GoogleSearchC」に対してユーザーIDを取得しておく
// APIで https://api.twitter.com/2/users/by/username/GoogleSearchC を呼び出すなどしてIDを調べる
const GOOGLE_SEARCH_CENTRAL_USER_ID = '22046611';

// Twitter API (v2) でユーザーのツイートを取得するエンドポイント
// 例: https://api.twitter.com/2/users/:id/tweets
// 必要に応じてクエリパラメータ (tweet.fields, expansionsなど) を付ける
const TWITTER_URL = `https://api.twitter.com/2/users/${GOOGLE_SEARCH_CENTRAL_USER_ID}/tweets?max_results=5`;

/**
 * 前回の最新ツイートIDを読み込む
 */
function loadLatestId() {
  if (!fs.existsSync(LATEST_ID_FILE)) {
    return null;
  }
  const data = fs.readFileSync(LATEST_ID_FILE, 'utf-8');
  try {
    const json = JSON.parse(data);
    return json.latestTweetId;
  } catch (error) {
    // JSONパース失敗時はとりあえずnullを返す
    return null;
  }
}

/**
 * 今回の最新ツイートIDを保存する
 */
function saveLatestId(tweetId) {
  fs.writeFileSync(LATEST_ID_FILE, JSON.stringify({ latestTweetId: tweetId }), 'utf-8');
}

/**
 * Twitter API から最新ツイートを取得
 */
async function fetchLatestTweet() {
  // GitHub Actions で設定された Secrets が環境変数として渡される
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    throw new Error('TWITTER_BEARER_TOKEN が設定されていません');
  }

  const response = await fetch(TWITTER_URL, {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.data || result.data.length === 0) {
    return null;
  }

  // data[0] が一番最新のツイートと仮定
  return result.data[0];
}

/**
 * Slack に通知
 */
async function notifySlack(tweet) {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    console.warn('SLACK_WEBHOOK_URL が設定されていません');
    return;
  }

  const message = {
    text: `**New Google Search Central Tweet**\n${tweet.text}`
  };

  const response = await fetch(slackWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    console.error('Slack通知に失敗しました', response.status, response.statusText);
  }
}

/**
 * メイン関数
 */
async function main() {
  try {
    const oldLatestId = loadLatestId();
    const latestTweet = await fetchLatestTweet();

    if (!latestTweet) {
      console.log('新しいツイートが見つかりませんでした');
      return;
    }

    const newId = latestTweet.id;

    // 前回のIDと変わっていれば新しいツイート
    if (newId !== oldLatestId) {
      console.log('新しいツイートを検知しました:', newId);
      await notifySlack(latestTweet);
      saveLatestId(newId);
    } else {
      console.log('新しいツイートはありません');
    }
  } catch (error) {
    console.error('Error in monitoring:', error);
    // エラーがあれば exit code 1 で Actions も失敗扱いにする
    process.exit(1);
  }
}

main();
