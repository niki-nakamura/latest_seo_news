/* monitor.js */
const fs = require('fs');
const fetch = require('node-fetch');
const { execSync } = require('child_process');

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

// @googlesearchc の数値ID（実際のIDに差し替えてください）
const TARGET_USER_ID = '22046611';

// 前回取得した最新ツイートIDを記録するファイル
const LATEST_ID_FILE = './latest_tweet_id.json';

/** (A) Block Kit形式メッセージを作る（Slackのプレビューを利用） */
function createSlackBlockMessage(tweet) {
  const tweetUrl = `https://x.com/googlesearchc/status/${tweet.id}`;
  return {
    text: tweetUrl, // ここにURLを直接入れることでSlack上でプレビューが出る
    unfurl_links: true,
    unfurl_media: true,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\n\n:loudspeaker: Google Search Central のXアカウントが更新されました!!\n\n｜Google Search Central's X account has been updated!!`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'X(Twitter)で詳細を見る' },
            url: tweetUrl
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\n｜URL: ${tweetUrl}`
        }
      }
    ]
  };
}

/** (B) Slackへ送信 */
async function postToSlack(tweet) {
  const payload = createSlackBlockMessage(tweet);
  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`Slack Webhook error: ${res.status} ${res.statusText}`);
  }
}

/** (C) 前回の最新IDをファイルから読む */
function getLatestTweetIdFromFile() {
  try {
    if (fs.existsSync(LATEST_ID_FILE)) {
      const data = fs.readFileSync(LATEST_ID_FILE, 'utf8');
      const json = JSON.parse(data);
      return json.latest_id;
    }
  } catch (error) {
    console.error('Error reading ID file:', error);
  }
  return null;
}

/** (D) 最新IDをファイルに書き込んでコミット&プッシュ */
function saveLatestTweetIdToFile(tweetId) {
  try {
    fs.writeFileSync(LATEST_ID_FILE, JSON.stringify({ latest_id: tweetId }), 'utf8');
    console.log(`Wrote latest tweet ID to ${LATEST_ID_FILE}: ${tweetId}`);

    // GitHub Actions上でコミットするための設定
    execSync('git config user.name "github-actions[bot]"');
    execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');

    execSync(`git add ${LATEST_ID_FILE}`);
    execSync(`git commit -m "Update latest_tweet_id.json to ${tweetId} [skip ci]"`);
    execSync('git push');

    console.log('Pushed updated latest_tweet_id.json to the repository.');
  } catch (error) {
    console.error('Error writing ID file or pushing to repo:', error);
  }
}

/** (E) Twitter APIで最新ツイートを取得（429なら即終了） */
async function fetchLatestTweet() {
  const url = `https://api.twitter.com/2/users/${TARGET_USER_ID}/tweets`
            + `?max_results=5`
            + `&tweet.fields=created_at,text`
            + `&expansions=attachments.media_keys`
            + `&media.fields=url,preview_image_url`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}` }
  });

  // レートリミットに当たったら今回の実行はあきらめる
  if (res.status === 429) {
    console.error("Rate limit exceeded. Aborting this run immediately.");
    return null;
  }

  // その他のエラーは例外にする
  if (!res.ok) {
    throw new Error(`Twitter API error: ${res.status} ${res.statusText}`);
  }

  // 正常応答をパース
  const data = await res.json();
  if (!data || !data.data || data.data.length === 0) {
    return null; // ツイートが無い
  }

  // 最新ツイート（配列先頭）
  const tweetObj = data.data[0];

  let mediaUrl = null;
  if (data.includes && data.includes.media && data.includes.media.length > 0) {
    const firstMedia = data.includes.media[0];
    mediaUrl = firstMedia.url || firstMedia.preview_image_url || null;
  }

  return {
    id: tweetObj.id,
    text: tweetObj.text,
    created_at: tweetObj.created_at,
    mediaUrl
  };
}

/** (F) メイン処理 */
(async function main() {
  try {
    const prevLatestId = getLatestTweetIdFromFile();
    const latestTweet = await fetchLatestTweet();

    // ツイートが取得できなかった場合（null）は終了
    if (!latestTweet) {
      console.log('No new tweet found or rate-limited. Exiting.');
      return;
    }

    // 最新ツイートIDが前回と異なればSlack通知＆ID更新
    if (latestTweet.id !== prevLatestId) {
      console.log('New tweet found! Sending to Slack...');
      await postToSlack(latestTweet);
      saveLatestTweetIdToFile(latestTweet.id);
    } else {
      console.log('No new tweet since last check.');
    }
  } catch (error) {
    console.error('Error in monitoring:', error);
    process.exit(1);
  }
})();
