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

let initPromise = null;

/** アプリ起動時に一度だけ呼ぶ（BootScene等） */
export function initAds() {
  if (!Capacitor.isNativePlatform()) return Promise.resolve(false);
  if (initPromise) return initPromise;
  initPromise = AdMob.initialize({ initializeForTesting: false })
    .then(() => true)
    .catch((e) => {
      console.warn("[ads] AdMob初期化に失敗しました", e);
      return false;
    });
  return initPromise;
}

/**
 * リワード動画広告を読み込んで表示する。
 * @returns {Promise<boolean>} 視聴完了して報酬を獲得したら true
 */
export async function showRewardedAd() {
  if (!Capacitor.isNativePlatform()) {
    // ブラウザ開発時はAdMobが動作しないため、動作確認用に成功扱いにする
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return true;
  }

  await initAds();

  return new Promise((resolve) => {
    let settled = false;
    let handles = [];
    const finish = (result) => {
      if (settled) return;
      settled = true;
      handles.forEach((h) => h.remove());
      resolve(result);
    };

    Promise.all([
      AdMob.addListener(RewardAdPluginEvents.Rewarded, () => finish(true)),
      AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => finish(false)),
      AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => finish(false)),
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => finish(false)),
    ]).then((addedHandles) => {
      handles = addedHandles;
      AdMob.prepareRewardVideoAd({
        adId: getRewardedAdUnitId(),
        isTesting: false,
      })
        .then(() => AdMob.showRewardVideoAd())
        .catch((e) => {
          console.warn("[ads] リワード広告の表示に失敗しました", e);
          finish(false);
        });
    });
  });
}
