const api = typeof browser !== "undefined" ? browser : chrome;

const STORAGE_PREFIX = "monitor_";

// 対象タブ内の<video>要素が実際に再生中かどうかを判定する関数。
// この関数はページのコンテキストで実行される。
function checkIsPlayingInPage() {
  const video = document.querySelector("video");
  if (!video) return false;
  return !video.paused && !video.ended && video.readyState > 2 && video.currentTime > 0.5;
}

async function stopMonitoring(alarmName, tabId) {
  await api.alarms.clear(alarmName);
  await api.storage.local.remove(alarmName);
  if (tabId !== undefined) {
    api.action.setBadgeText({ text: "", tabId }).catch(() => {});
  }
}

// 対象タブを取得する。閉じられていた場合は記録していたURLで開き直す。
async function resolveTab(info) {
  let tab = null;
  try {
    tab = await api.tabs.get(info.tabId);
  } catch (e) {
    tab = null;
  }
  if (!tab) {
    tab = await api.tabs.create({ url: info.url, active: true });
    info.tabId = tab.id;
  }
  return tab;
}

async function bringToFront(tab) {
  await api.tabs.update(tab.id, { active: true });
  await api.windows.update(tab.windowId, { focused: true });
}

api.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(STORAGE_PREFIX)) return;

  const data = await api.storage.local.get(alarm.name);
  const info = data[alarm.name];
  if (!info) {
    await api.alarms.clear(alarm.name);
    return;
  }

  // 対象タブを取得する(閉じられていた場合は開き直す)
  let tab = null;
  try {
    tab = await resolveTab(info);
  } catch (e) {
    console.warn("タブの再作成に失敗しました", e);
    await stopMonitoring(alarm.name);
    return;
  }

  const isFirstCheck = !info.checksDone;

  // 指定した時刻になったら、まずタブを前面表示する
  try {
    await bringToFront(tab);
  } catch (e) {
    console.warn("タブの前面表示に失敗しました", e);
  }

  // タブ内で再生状態を確認する
  let isPlaying = false;
  try {
    const results = await api.scripting.executeScript({
      target: { tabId: tab.id },
      func: checkIsPlayingInPage,
    });
    isPlaying = Boolean(results && results[0] && results[0].result);
  } catch (e) {
    console.warn("再生状態の確認に失敗しました(ページ読み込み中の可能性があります)", e);
  }

  if (isPlaying) {
    // 配信が始まっている -> 監視終了
    api.action.setBadgeText({ text: "LIVE", tabId: tab.id }).catch(() => {});
    api.action.setBadgeBackgroundColor({ color: "#0a8a3c" }).catch(() => {});
    await stopMonitoring(alarm.name);
    return;
  }

  info.checksDone = (info.checksDone || 0) + 1;

  if (info.checksDone >= info.maxChecks) {
    // 最大確認回数に達したので監視終了
    api.action.setBadgeText({ text: "×", tabId: tab.id }).catch(() => {});
    api.action.setBadgeBackgroundColor({ color: "#d40000" }).catch(() => {});
    await stopMonitoring(alarm.name);
    return;
  }

  // まだ配信が始まっていない場合はリロードする(最初のチェックは前面表示のみで、
  // リロードは元々ページを開いていた状態を活かすため2回目以降から行う)
  try {
    if (!isFirstCheck) {
      await api.tabs.reload(tab.id);
    }
    api.action.setBadgeText({
      text: String(info.maxChecks - info.checksDone),
      tabId: tab.id,
    }).catch(() => {});
  } catch (e) {
    console.warn("タブの操作に失敗しました", e);
  }

  await api.storage.local.set({ [alarm.name]: info });
});
