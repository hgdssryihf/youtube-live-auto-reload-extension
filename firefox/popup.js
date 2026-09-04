const api = typeof browser !== "undefined" ? browser : chrome;

const STORAGE_PREFIX = "monitor_";
const LAST_SETTINGS_KEY = "last_input_settings";

let currentTab = null;

async function init() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;
  const el = document.getElementById("currentTab");
  el.textContent = `対象タブ: ${tab.title || tab.url}`;

  const defaultTime = new Date(Date.now() + 60 * 1000);
  document.getElementById("datetimeInput").value = toLocalInputValue(defaultTime);

  // 前回入力した確認間隔・監視時間を復元する
  const lastSettings = await getLastSettings();
  if (lastSettings) {
    if (lastSettings.intervalValue !== undefined) {
      document.getElementById("intervalInput").value = lastSettings.intervalValue;
    }
    if (lastSettings.intervalUnit) {
      document.getElementById("intervalUnit").value = lastSettings.intervalUnit;
    }
    if (lastSettings.durationValue !== undefined) {
      document.getElementById("durationInput").value = lastSettings.durationValue;
    }
    if (lastSettings.durationUnit) {
      document.getElementById("durationUnit").value = lastSettings.durationUnit;
    }
  }

  // 日時が確定したら(changeイベント)、または「決定」ボタンでカレンダー(ネイティブピッカー)を閉じる
  const datetimeInputEl = document.getElementById("datetimeInput");
  datetimeInputEl.addEventListener("change", () => {
    datetimeInputEl.blur();
  });
  document.getElementById("datetimeConfirmBtn").addEventListener("click", () => {
    datetimeInputEl.blur();
  });

  // 確認間隔・監視時間を変更したら、その都度記憶しておく
  ["intervalInput", "intervalUnit", "durationInput", "durationUnit"].forEach((id) => {
    document.getElementById(id).addEventListener("change", saveCurrentSettings);
  });

  renderScheduleList();
}

async function getLastSettings() {
  const data = await api.storage.local.get(LAST_SETTINGS_KEY);
  return data[LAST_SETTINGS_KEY] || null;
}

async function saveCurrentSettings() {
  const settings = {
    intervalValue: document.getElementById("intervalInput").value,
    intervalUnit: document.getElementById("intervalUnit").value,
    durationValue: document.getElementById("durationInput").value,
    durationUnit: document.getElementById("durationUnit").value,
  };
  await api.storage.local.set({ [LAST_SETTINGS_KEY]: settings });
}

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

async function getAllSchedules() {
  const all = await api.storage.local.get(null);
  return Object.entries(all).filter(([key]) => key.startsWith(STORAGE_PREFIX));
}

async function renderScheduleList() {
  const listEl = document.getElementById("scheduleList");
  const entries = await getAllSchedules();

  if (entries.length === 0) {
    listEl.innerHTML = '<div class="empty">監視中のスケジュールはありません</div>';
    return;
  }

  listEl.innerHTML = "";
  for (const [name, info] of entries) {
    const div = document.createElement("div");
    div.className = "schedule-item";

    const timeStr = new Date(info.when).toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const top = document.createElement("div");
    top.className = "schedule-top";

    const infoSpan = document.createElement("span");
    infoSpan.className = "schedule-info";
    infoSpan.textContent = `${timeStr}〜 - ${info.title || info.url}`;

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "停止";
    delBtn.addEventListener("click", async () => {
      await api.alarms.clear(name);
      await api.storage.local.remove(name);
      api.action.setBadgeText({ text: "", tabId: info.tabId });
      renderScheduleList();
    });

    top.appendChild(infoSpan);
    top.appendChild(delBtn);

    const sub = document.createElement("div");
    sub.className = "schedule-sub";
    sub.textContent = `確認間隔: ${formatInterval(info.intervalMinutes)} / 確認回数: ${info.checksDone || 0} / ${info.maxChecks}回`;

    div.appendChild(top);
    div.appendChild(sub);
    listEl.appendChild(div);
  }
}

function toMinutes(value, unit) {
  return unit === "sec" ? value / 60 : value;
}

function formatInterval(minutes) {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}秒`;
  }
  return `${minutes}分`;
}

// 同じタブに対する既存の監視予定があれば、すべて削除する(上書きのため)
async function clearExistingSchedulesForTab(tabId) {
  const entries = await getAllSchedules();
  for (const [name, info] of entries) {
    if (info && info.tabId === tabId) {
      await api.alarms.clear(name);
      await api.storage.local.remove(name);
    }
  }
}

document.getElementById("addBtn").addEventListener("click", async () => {
  const value = document.getElementById("datetimeInput").value;

  const intervalRaw = Math.max(1, parseFloat(document.getElementById("intervalInput").value) || 1);
  const intervalUnit = document.getElementById("intervalUnit").value;
  let intervalMinutes = toMinutes(intervalRaw, intervalUnit);

  const durationRaw = Math.max(1, parseFloat(document.getElementById("durationInput").value) || 1);
  const durationUnit = document.getElementById("durationUnit").value;
  const durationMinutes = toMinutes(durationRaw, durationUnit);

  await saveCurrentSettings();

  if (!value || !currentTab) {
    alert("日時を入力してください。");
    return;
  }

  const when = new Date(value).getTime();
  if (isNaN(when)) {
    alert("日時の形式が正しくありません。");
    return;
  }

  // Firefoxはchromeのような「30秒未満は自動的に引き上げられる」仕様がないため、
  // より短い間隔も設定可能。ただし極端に短い値は動作が不安定になったり、
  // 頻繁な前面表示で作業の妨げになるため、目安として注意を促す
  if (intervalMinutes < (5 / 60)) {
    const proceed = confirm(
      "確認間隔が5秒未満です。極端に短い間隔は動作が不安定になったり、頻繁にタブが前面に切り替わって作業の妨げになる可能性があります。このまま設定しますか?"
    );
    if (!proceed) return;
  }

  // 同じタブに既存の監視予定があれば削除してから新しく登録する(上書き)
  await clearExistingSchedulesForTab(currentTab.id);

  const maxChecks = Math.max(1, Math.ceil(durationMinutes / intervalMinutes));
  const alarmName = `${STORAGE_PREFIX}${currentTab.id}_${Date.now()}`;

  await api.alarms.create(alarmName, {
    when,
    periodInMinutes: intervalMinutes,
  });

  await api.storage.local.set({
    [alarmName]: {
      tabId: currentTab.id,
      url: currentTab.url,
      title: currentTab.title,
      when,
      intervalMinutes,
      maxChecks,
      checksDone: 0,
    },
  });

  api.action.setBadgeText({ text: "...", tabId: currentTab.id });
  api.action.setBadgeBackgroundColor({ color: "#888888" });

  window.close();
});

init();
