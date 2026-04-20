/**
 * Firebase Authentication wrapper (Google Sign-In via Capacitor plugin)
 * - Android では native Google Sign-In
 * - Web では Google サインインをスキップ（ゲストのみ）
 */
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

const STORAGE_KEY = "mancolor_auth_user";
const PLAYER_NAME_KEY = "mancolor_player_name";

/** 保存済みユーザー情報を取得 */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** 表示用プレイヤー名を取得（カスタム名 > Google名 > ゲスト） */
export function getPlayerName() {
  const custom = localStorage.getItem(PLAYER_NAME_KEY);
  if (custom) return custom;
  return getStoredUser()?.displayName || "ゲスト";
}

/** プレイヤー名を保存 */
export function setPlayerName(name) {
  const trimmed = name.trim().slice(0, 20);
  if (trimmed) localStorage.setItem(PLAYER_NAME_KEY, trimmed);
}

/** Google サインイン（Android のみ） */
export async function signInWithGoogle() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Google Sign-In はアプリ版のみ対応しています");
  }
  let result;
  try {
    result = await FirebaseAuthentication.signInWithGoogle();
  } catch (e) {
    const msg = String(e?.message ?? "");
    console.error("[firebaseAuth] signInWithGoogle failed:", msg, e);
    if (
      msg.includes("No credential available") ||
      msg.includes("no credential") ||
      msg.includes("NoCredentialException")
    ) {
      // Play Store 内部テストの場合は Play App Signing の SHA 証明書フィンガープリントを
      // Firebase コンソール → プロジェクト設定 → アプリ → SHA に登録する必要があります。
      throw new Error(
        "Googleログインに失敗しました。\nFirebaseコンソールに Play App Signing の SHA フィンガープリントが登録されているか確認してください。",
      );
    }
    throw new Error(`Googleログインに失敗しました（${msg || "不明なエラー"}）`);
  }
  _storeUser(result.user);
  // カスタム名未設定なら Google 名をデフォルトにする
  if (!localStorage.getItem(PLAYER_NAME_KEY) && result.user?.displayName) {
    localStorage.setItem(PLAYER_NAME_KEY, result.user.displayName);
  }
  return result.user;
}

/** サインアウト */
export async function signOut() {
  try {
    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut();
    }
  } catch (_) {
    // ignore
  }
  localStorage.removeItem(STORAGE_KEY);
}

/** 起動時にセッションを復元 */
export async function restoreSession() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const result = await FirebaseAuthentication.getCurrentUser();
    if (result.user) {
      _storeUser(result.user);
      return result.user;
    }
  } catch (_) {
    // not signed in
  }
  return null;
}

function _storeUser(user) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoUrl: user.photoUrl,
    }),
  );
}
