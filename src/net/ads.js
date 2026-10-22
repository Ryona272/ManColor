/** リワード動画広告（AdMob）ラッパー */
import { Capacitor } from "@capacitor/core";
import { AdMob, RewardAdPluginEvents } from "@capacitor-community/admob";

const REWARDED_AD_ID_ANDROID = "ca-app-pub-1651721148458448/4773509550";
const REWARDED_AD_ID_IOS = "";

function getRewardedAdUnitId() {
  return Capacitor.getPlatform() === "ios"
    ? REWARDED_AD_ID_IOS
    : REWARDED_AD_ID_ANDROID;
}

export function isRewardedAdAvailable() {
  return Capacitor.isNativePlatform() && Boolean(getRewardedAdUnitId());
}

let initPromise = null;

/** アプリ起動時に一度だけ呼ぶ（BootScene等） */
export function initAds() {
  if (!isRewardedAdAvailable()) return Promise.resolve(false);
  if (initPromise) return initPromise;
  initPromise = AdMob.initialize({ initializeForTesting: false })
    .then(() => true)
    .catch((e) => {
      console.warn("[ads] AdMob初期化に失敗しました", e);
      initPromise = null;
      return false;
    });
  return initPromise;
}

/**
 * リワード動画広告を読み込んで表示する。
 * @returns {Promise<boolean>} 視聴完了して報酬を獲得したら true
 */
export async function showRewardedAd() {
  if (!isRewardedAdAvailable()) return false;

  if (!(await initAds())) return false;

  let settled = false;
  const handles = [];
  let resolveResult;
  const result = new Promise((resolve) => {
    resolveResult = resolve;
  });
  const finish = (rewarded) => {
    if (settled) return;
    settled = true;
    handles.forEach((handle) => {
      handle.remove().catch((e) => {
        console.warn("[ads] 広告イベントの解除に失敗しました", e);
      });
    });
    resolveResult(rewarded);
  };

  try {
    const events = [
      [RewardAdPluginEvents.Rewarded, true],
      [RewardAdPluginEvents.FailedToShow, false],
      [RewardAdPluginEvents.FailedToLoad, false],
      [RewardAdPluginEvents.Dismissed, false],
    ];
    for (const [event, rewarded] of events) {
      const handle = await AdMob.addListener(event, () => finish(rewarded));
      handles.push(handle);
    }
  } catch (e) {
    console.warn("[ads] 広告イベントの登録に失敗しました", e);
    finish(false);
    return result;
  }

  AdMob.prepareRewardVideoAd({
    adId: getRewardedAdUnitId(),
    isTesting: false,
  })
    .then(() => AdMob.showRewardVideoAd())
    .catch((e) => {
      console.warn("[ads] リワード広告の表示に失敗しました", e);
      finish(false);
    });

  return result;
}
