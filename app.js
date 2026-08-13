// モックデータ (初期テスト用)
let events = [
    {
        id: "1",
        district: "城南校区",
        title: "城南夏祭り",
        date: "2026-08-15",
        time: "17:00 - 21:00",
        location: "城南小学校グラウンド",
        description: "毎年恒例の夏祭りを開催します！盆踊りや屋台（焼きそば、かき氷、ヨーヨー釣りなど）が出店予定です。\n\n【アピールポイント】\n地域最大のお祭りです！\n\n【対象者・おすすめな方】\nどなたでも大歓迎！\n\n【参加費】\n入場無料",
        status: "未着手"
    },
    {
        id: "2",
        district: "別府校区",
        title: "地域防災クイズ大会",
        date: "2026-08-20",
        time: "10:00 - 12:00",
        location: "別府公民館 講堂",
        description: "楽しく防災について学ぶクイズ大会を開催！正解者には非常食セットや防災グッズなどの景品をご用意しています。\n\n【対象者・おすすめな方】\n親子での参加がおすすめです！",
        status: "作成中"
    }
];

// アプリケーション状態管理
let currentYear = 2026;
let currentMonth = 7; // 0-indexed (8月は7)
let selectedEvent = null;

// 設定オブジェクト
let appSettings = {
    sheetUrl: "",
    geminiKey: ""
};

// DOMが読み込まれたら起動
document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    initApp();
});

function initApp() {
    // タブ切り替え
    const navItems = document.querySelectorAll(".nav-item");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = item.getAttribute("data-tab");
            
            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");

            document.querySelectorAll(".tab-content").forEach(tab => {
                tab.classList.remove("active");
            });
            document.getElementById(`tab-${tabId}`).classList.add("active");

            // タップしてタブを切り替えたら、サイドバーを自動で閉じる (スマホ用)
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
        });
    });

    // モバイルメニューのトグル開閉
    const menuToggleBtn = document.getElementById("menu-toggle-btn");
    if (menuToggleBtn) {
        menuToggleBtn.addEventListener("click", () => {
            sidebar.classList.add("active");
            overlay.classList.add("active");
        });
    }

    if (overlay) {
        overlay.addEventListener("click", () => {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
        });
    }

    // カレンダー月移動
    document.getElementById("prev-month-btn").addEventListener("click", () => {
        if (currentMonth === 0) {
            currentMonth = 11;
            currentYear--;
        } else {
            currentMonth--;
        }
        renderCalendar();
    });

    document.getElementById("next-month-btn").addEventListener("click", () => {
        if (currentMonth === 11) {
            currentMonth = 0;
            currentYear++;
        } else {
            currentMonth++;
        }
        renderCalendar();
    });

    // 設定保存
    document.getElementById("save-settings-btn").addEventListener("click", saveSettings);

    // AI自動生成ボタン
    document.getElementById("generate-ai-btn").addEventListener("click", generatePostWithAI);

    // コピーボタンの設定
    document.querySelectorAll(".copy-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");
            const textarea = document.getElementById(targetId);
            textarea.select();
            document.execCommand("copy");
            showToast("クリップボードにコピーしました！");
        });
    });

    // AI生成結果エリアのタブ切り替え
    const subtabs = document.querySelectorAll(".tab-sub-item");
    subtabs.forEach(subtab => {
        subtab.addEventListener("click", () => {
            subtabs.forEach(s => s.classList.remove("active"));
            subtab.classList.add("active");

            const subtabId = subtab.getAttribute("data-subtab");
            document.querySelectorAll(".subtab-content").forEach(content => {
                content.classList.remove("active");
            });
            document.getElementById(`subtab-${subtabId}`).classList.add("active");
        });
    });

    // 検索・フィルタリングのイベント
    document.getElementById("search-input").addEventListener("input", filterData);
    document.getElementById("filter-district").addEventListener("change", filterData);
    document.getElementById("filter-status").addEventListener("change", filterData);

    // スプレッドシート同期ボタン
    document.getElementById("sync-sheet-btn").addEventListener("click", fetchSpreadsheetData);

    // 初期化描画
    renderCalendar();
    renderEventTable();
    updateFilterOptions();
}

// カレンダー描画
function renderCalendar() {
    const daysContainer = document.getElementById("calendar-days");
    daysContainer.innerHTML = "";

    const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
    document.getElementById("current-month-year").textContent = `${currentYear}年 ${months[currentMonth]}`;

    // 月の最初の日と最終日を取得
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevLastDay = new Date(currentYear, currentMonth, 0).getDate();

    // 先月の末尾の日を挿入
    for (let x = firstDayIndex; x > 0; x--) {
        const dayDiv = document.createElement("div");
        dayDiv.classList.add("calendar-day", "other-month");
        dayDiv.innerHTML = `<span class="day-number">${prevLastDay - x + 1}</span>`;
        daysContainer.appendChild(dayDiv);
    }

    // 今月の日付を挿入
    for (let i = 1; i <= lastDay; i++) {
        const dayDiv = document.createElement("div");
        dayDiv.classList.add("calendar-day");
        
        // 今日の判定
        const today = new Date();
        if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            dayDiv.classList.add("today");
        }

        const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        dayDiv.innerHTML = `
            <span class="day-number">${i}</span>
            <div class="event-badges-container" id="events-${dateString}"></div>
        `;

        // この日に登録されているイベントをバッジ化
        const dayEvents = events.filter(e => e.date === dateString);
        const badgeContainer = dayDiv.querySelector(".event-badges-container");
        dayEvents.forEach(e => {
            const badge = document.createElement("div");
            badge.classList.add("event-badge");
            badge.textContent = `[${e.district.replace("校区", "")}] ${e.title}`;
            
            // 校区別の配色クラスを決定
            const dist = e.district.replace("校区", "");
            let badgeClass = "badge-default";
            
            if (dist.includes("堤丘")) badgeClass = "badge-tsutsumigaoka";
            else if (dist.includes("堤")) badgeClass = "badge-tsutsumi";
            else if (dist.includes("南片江")) badgeClass = "badge-minamikatae";
            else if (dist.includes("片江")) badgeClass = "badge-katae";
            else if (dist.includes("長尾")) badgeClass = "badge-nagao";
            else if (dist.includes("金山")) badgeClass = "badge-kanayama";
            else if (dist.includes("七隈")) badgeClass = "badge-nanakuma";
            else if (dist.includes("城南")) badgeClass = "badge-jonan";
            else if (dist.includes("田島")) badgeClass = "badge-tashima";
            else if (dist.includes("別府")) badgeClass = "badge-befu";
            else if (dist.includes("鳥飼")) badgeClass = "badge-torikai";

            badge.classList.add(badgeClass);
            badgeContainer.appendChild(badge);
        });

        // 日をクリックした時の詳細パネル表示
        dayDiv.addEventListener("click", () => {
            if (dayEvents.length > 0) {
                showEventDetails(dayEvents[0]);
            }
        });

        daysContainer.appendChild(dayDiv);
    }

    // 翌月の頭の日付を挿入して42マス(6段)を完全に満たすようにする
    const totalCells = firstDayIndex + lastDay;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
        const dayDiv = document.createElement("div");
        dayDiv.classList.add("calendar-day", "other-month");
        dayDiv.innerHTML = `<span class="day-number">${i}</span>`;
        daysContainer.appendChild(dayDiv);
    }
}

// 詳細パネルの表示
function showEventDetails(event) {
    selectedEvent = event;
    document.getElementById("empty-state").classList.add("hidden");
    const detailContent = document.getElementById("event-detail-content");
    detailContent.classList.remove("hidden");

    document.getElementById("detail-district").textContent = event.district;
    
    const statusTag = document.getElementById("detail-status");
    statusTag.textContent = event.status;
    statusTag.className = "tag tag-status";
    if (event.status === "未着手") statusTag.classList.add("status-not-started");
    else if (event.status === "作成中") statusTag.classList.add("status-working");
    else if (event.status === "予約済み") statusTag.classList.add("status-scheduled");
    else if (event.status === "投稿完了") statusTag.classList.add("status-completed");

    document.getElementById("detail-title").textContent = event.title;
    document.getElementById("detail-datetime").textContent = `${event.date} (${getDayOfWeek(event.date)}) ${event.time}`;
    document.getElementById("detail-location").textContent = event.location;
    document.getElementById("detail-description").textContent = event.description;

    // AI生成結果エリアを初期化
    document.getElementById("ai-result-area").classList.add("hidden");
}

// 曜日取得用ヘルパー
function getDayOfWeek(dateString) {
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    const d = new Date(dateString);
    return days[d.getDay()];
}

// AI投稿文・構成案生成
async function generatePostWithAI() {
    if (!selectedEvent) return;

    const tone = document.getElementById("ai-tone").value;
    const loader = document.getElementById("ai-loader");
    const resultArea = document.getElementById("ai-result-area");

    loader.classList.remove("hidden");
    resultArea.classList.add("hidden");

    // AIプロンプトの作成
    const prompt = `
以下のイベント情報を元に、地域の方々が「ぜひ参加したい！」と思えるようなInstagramの投稿案を作成してください。

【イベント情報】
- 校区: ${selectedEvent.district}
- イベント名: ${selectedEvent.title}
- 開催日時: ${selectedEvent.date} ${selectedEvent.time}
- 開催場所: ${selectedEvent.location}
- 詳細内容: ${selectedEvent.description}

【要望】
1. キャプション（投稿本文）: 
   - トーンは「${tone === 'friendly' ? '親しみやすく元気' : tone === 'informative' ? 'わかりやすく丁寧' : 'ワクワクするイベント調'}」で記述。
   - 適宜、改行や絵文字を入れて視覚的に読みやすくする。
   - スプレッドシートにある詳細情報（アピールポイント、参加費、対象者、申込先など）が含まれている場合は、それらを正確にキャプションに反映させること。
   - 最後に、地域住民が検索しやすいハッシュタグ（例: #地域活性化 #イベント #城南区 など）を10〜15個程度付与する。
2. リール動画・画像スライド構成案:
   - 3〜4スライドまたは30秒以内のリール動画の構成案を作成。
   - 各スライド/シーンにおける「ビジュアル（映像）イメージ」と「挿入するテロップ/ナレーションの言葉」を箇条書きで分かりやすく提案する。
`;

    // APIキーがない場合はフォールバック
    if (!appSettings.geminiKey) {
        setTimeout(() => {
            loader.classList.add("hidden");
            resultArea.classList.remove("hidden");
            
            const genericCaption = `【${selectedEvent.district}からのお知らせ📢】\n\n皆さんこんにちは！✨\n今回は、地域で大注目のイベント「${selectedEvent.title}」をご紹介します！🎉\n\n子供から大人まで楽しめる企画が盛りだくさんなので、ぜひご家族やお友達と一緒に遊びにきてくださいね😊\n\n📍場所: ${selectedEvent.location}\n📅日時: ${selectedEvent.date} ${selectedEvent.time}\n\n📝詳細内容:\n${selectedEvent.description}\n\n皆様の参加をお待ちしております！🙌\n\n#${selectedEvent.district} #${selectedEvent.title} #地域イベント #公民館活動 #福岡市 #コミュニティ`;
            
            const genericReels = `【リール動画構成案（約15秒）】\n\n■シーン1（開始〜3秒）\n・映像: イベント会場や準備中の楽しそうな様子\n・テロップ: 【注目！】今週末開催のイチオシイベント！\n\n■シーン2（3秒〜8秒）\n・映像: イベントの見どころ（美味しい屋台やアクティビティなど）\n・テロップ: お子様から大人まで楽しめる！${selectedEvent.title}\n\n■シーン3（8秒〜12秒）\n・映像: 開催日・場所のテキスト画像\n・テロップ: 📅${selectedEvent.date} 📍${selectedEvent.location}へ集まれ！\n\n■シーン4（12秒〜15秒）\n・映像: 笑顔のスタッフや過去の楽しそうな写真\n・テロップ: 詳しくはプロフィール欄のリンクをチェック！`;

            document.getElementById("output-caption").value = genericCaption;
            document.getElementById("output-reels").value = genericReels;
            showToast("APIキーが未設定のため、テンプレートで生成しました。設定タブからAPIキーを追加すると、AIが個別生成します。");
        }, 1200);
        return;
    }

    try {
        // Gemini APIの呼び出し
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${appSettings.geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            throw new Error("APIリクエストに失敗しました。");
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;

        // レスポンスをキャプションと構成案に分割（簡易的なパーサー）
        let caption = generatedText;
        let reels = "リール構成案は上記キャプションを参照、もしくは詳細を元に作成してください。";

        if (generatedText.includes("キャプション") && generatedText.includes("構成案")) {
            const parts = generatedText.split(/2\.\s*リール/);
            caption = parts[0].replace(/1\.\s*キャプション.*?\n/, "");
            reels = parts[1] ? "【リール/画像構成案】\n" + parts[1] : reels;
        }

        document.getElementById("output-caption").value = caption.trim();
        document.getElementById("output-reels").value = reels.trim();

        // 投稿ステータスを自動で「作成中」にする
        selectedEvent.status = "作成中";
        renderCalendar();
        renderEventTable();
        showEventDetails(selectedEvent);

        loader.classList.add("hidden");
        resultArea.classList.remove("hidden");
        showToast("AIが投稿文を生成しました！");

    } catch (error) {
        console.error("Gemini API Error:", error);
        loader.classList.add("hidden");
        showToast("AI生成中にエラーが発生しました。");
    }
}

// 設定のロード・セーブ
function loadSettings() {
    const saved = localStorage.getItem("commu_jonan_settings");
    if (saved) {
        appSettings = JSON.parse(saved);
        document.getElementById("setting-sheet-url").value = appSettings.sheetUrl || "";
        document.getElementById("setting-gemini-key").value = appSettings.geminiKey || "";
    }
}

function saveSettings() {
    appSettings.sheetUrl = document.getElementById("setting-sheet-url").value;
    appSettings.geminiKey = document.getElementById("setting-gemini-key").value;

    localStorage.setItem("commu_jonan_settings", JSON.stringify(appSettings));
    showToast("設定を保存しました！");
}

// トースト通知の表示
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 3000);
}

// フィルター用ドロップダウンの更新
function updateFilterOptions() {
    const districts = [...new Set(events.map(e => e.district))];
    const filterDistrict = document.getElementById("filter-district");
    
    // 一旦クリア
    filterDistrict.innerHTML = '<option value="all">すべての校区</option>';
    
    districts.forEach(d => {
        const option = document.createElement("option");
        option.value = d;
        option.textContent = d;
        filterDistrict.appendChild(option);
    });
}

// イベントテーブル描画
function renderEventTable(data = events) {
    const tbody = document.getElementById("event-table-body");
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">イベントが見つかりません</td></tr>`;
        return;
    }

    data.forEach(e => {
        const tr = document.createElement("tr");
        
        let statusBadgeClass = "tag-status status-not-started";
        if (e.status === "作成中") statusBadgeClass = "tag-status status-working";
        else if (e.status === "予約済み") statusBadgeClass = "tag-status status-scheduled";
        else if (e.status === "投稿完了") statusBadgeClass = "tag-status status-completed";

        tr.innerHTML = `
            <td><strong>${e.district}</strong></td>
            <td>${e.title}</td>
            <td>${e.date} ${e.time}</td>
            <td>${e.location}</td>
            <td><span class="tag ${statusBadgeClass}">${e.status}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm select-evt-btn" data-id="${e.id}">
                    選択する
                </button>
            </td>
        `;

        tr.querySelector(".select-evt-btn").addEventListener("click", () => {
            // カレンダータブへ切り替えて詳細を開く
            document.querySelector('.nav-item[data-tab="calendar"]').click();
            
            // 日付の月にカレンダーを設定
            const eventDate = new Date(e.date);
            currentYear = eventDate.getFullYear();
            currentMonth = eventDate.getMonth();
            renderCalendar();
            
            showEventDetails(e);
        });

        tbody.appendChild(tr);
    });
}

// 検索・フィルタリング処理
function filterData() {
    const query = document.getElementById("search-input").value.toLowerCase();
    const districtFilter = document.getElementById("filter-district").value;
    const statusFilter = document.getElementById("filter-status").value;

    const filtered = events.filter(e => {
        const matchesQuery = e.title.toLowerCase().includes(query) || 
                             e.district.toLowerCase().includes(query) || 
                             e.description.toLowerCase().includes(query);
        const matchesDistrict = districtFilter === "all" || e.district === districtFilter;
        const matchesStatus = statusFilter === "all" || e.status === statusFilter;

        return matchesQuery && matchesDistrict && matchesStatus;
    });

    renderEventTable(filtered);
}

// Googleスプレッドシートからのデータ同期
async function fetchSpreadsheetData() {
    if (!appSettings.sheetUrl) {
        showToast("設定タブからスプレッドシートの共有URLを設定してください。");
        return;
    }

    showToast("スプレッドシートからデータを同期中...");

    try {
        const matches = appSettings.sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!matches) {
            throw new Error("スプレッドシートのURLフォーマットが正しくありません。");
        }

        const sheetId = matches[1];
        const timestamp = new Date().getTime();
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&t=${timestamp}`;

        console.log("Fetching CSV from URL:", csvUrl);

        const response = await fetch(csvUrl, {
            headers: {
                'pragma': 'no-cache',
                'cache-control': 'no-cache'
            }
        });
        if (!response.ok) {
            throw new Error("データのダウンロードに失敗しました。公開範囲をご確認ください。");
        }

        const csvText = await response.text();
        parseCSVToEvents(csvText);

        renderCalendar();
        renderEventTable();
        updateFilterOptions();
        showToast("スプレッドシートとの同期が完了しました！");

    } catch (error) {
        console.error("Spreadsheet sync error:", error);
        showToast(`同期エラー: ${error.message}`);
    }
}

// CSVを解析してイベント配列に格納 (複数行対応の堅牢なパーサー)
function parseCSVToEvents(csvText) {
    const normalizedCsv = csvText.replace(/\r\n/g, "\n");
    
    const rows = [];
    let currentRow = [];
    let currentCell = "";
    let insideQuote = false;

    for (let i = 0; i < normalizedCsv.length; i++) {
        const char = normalizedCsv[i];
        const nextChar = normalizedCsv[i + 1];

        if (insideQuote) {
            if (char === '"') {
                if (nextChar === '"') {
                    currentCell += '"';
                    i++;
                } else {
                    insideQuote = false;
                }
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                insideQuote = true;
            } else if (char === ',') {
                currentRow.push(currentCell.trim());
                currentCell = "";
            } else if (char === '\n') {
                currentRow.push(currentCell.trim());
                rows.push(currentRow);
                currentRow = [];
                currentCell = "";
            } else {
                currentCell += char;
            }
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }

    if (rows.length <= 1) {
        console.error("CSV has no rows or only headers");
        return;
    }

    const headers = rows[0];
    
    // カラムインデックスのデフォルト初期値
    let timestampIdx = -1;
    let districtIdx = -1;
    let titleIdx = -1;
    let dateIdx = -1;
    let timeIdx = -1;
    let locationIdx = -1;
    let descIdx = -1;
    
    // 追加カラム
    let recommendIdx = -1;
    let targetUserIdx = -1;
    let capacityIdx = -1;
    let feeIdx = -1;
    let contactIdx = -1;
    let otherIdx = -1;

    // ヘッダー名に基づいてインデックスを厳密にマッピング
    headers.forEach((h, idx) => {
        const headerText = h.trim();
        if (headerText.includes("タイムスタンプ")) {
            timestampIdx = idx;
        } else if (headerText === "イベント名" || headerText.includes("イベントの名前") || headerText.includes("行事名")) {
            titleIdx = idx;
        } else if (headerText === "開催日程" || headerText.includes("開催日") || headerText.includes("日程")) {
            dateIdx = idx;
        } else if (headerText === "開催時間" || headerText.includes("時間") || headerText.includes("時刻")) {
            timeIdx = idx;
        } else if (headerText === "開催場所" || headerText.includes("場所") || headerText.includes("会場")) {
            locationIdx = idx;
        } else if (headerText === "イベント内容" || headerText.includes("内容") || headerText.includes("詳細")) {
            descIdx = idx;
        } else if (headerText.includes("校区") || headerText.includes("地区")) {
            districtIdx = idx;
        } else if (headerText.includes("おすすめ") || headerText.includes("アピール")) {
            recommendIdx = idx;
        } else if (headerText.includes("対象") || headerText.includes("どんな方")) {
            targetUserIdx = idx;
        } else if (headerText.includes("定員")) {
            capacityIdx = idx;
        } else if (headerText.includes("費") || headerText.includes("料金")) {
            feeIdx = idx;
        } else if (headerText.includes("申込") || headerText.includes("応募")) {
            contactIdx = idx;
        } else if (headerText.includes("その他")) {
            otherIdx = idx;
        }
    });

    const hasTimestamp = timestampIdx === 0 || headers[0].includes("タイムスタンプ");
    const offset = hasTimestamp ? 1 : 0;

    if (titleIdx === -1) titleIdx = 0 + offset;
    if (dateIdx === -1) dateIdx = 1 + offset;
    if (timeIdx === -1) timeIdx = 2 + offset;
    if (locationIdx === -1) locationIdx = 3 + offset;
    if (descIdx === -1) descIdx = 4 + offset;

    const parsedEvents = [];

    for (let i = 1; i < rows.length; i++) {
        const entries = rows[i];
        if (entries.length < 2 || !entries.join("").trim()) continue;

        const getVal = (idx, defaultVal = "") => {
            return (idx >= 0 && idx < entries.length) ? entries[idx] : defaultVal;
        };

        // 日付整形
        let rawDate = getVal(dateIdx);
        let formattedDate = "";
        const fullDateMatch = rawDate.match(/(\d{4})[/\-年](\d{1,2})[/\-月](\d{1,2})/);
        const shortDateMatch = rawDate.match(/(\d{1,2})[/\-月](\d{1,2})/);

        if (fullDateMatch) {
            formattedDate = `${fullDateMatch[1]}-${fullDateMatch[2].padStart(2, '0')}-${fullDateMatch[3].padStart(2, '0')}`;
        } else if (shortDateMatch && !rawDate.match(/\d{4}/)) {
            formattedDate = `${currentYear}-${shortDateMatch[1].padStart(2, '0')}-${shortDateMatch[2].padStart(2, '0')}`;
        } else {
            const parsedMs = Date.parse(rawDate);
            if (!isNaN(parsedMs)) {
                const parsedD = new Date(parsedMs);
                formattedDate = `${parsedD.getFullYear()}-${String(parsedD.getMonth()+1).padStart(2, '0')}-${String(parsedD.getDate()).padStart(2, '0')}`;
            } else {
                const d = new Date();
                formattedDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
        }

        const title = getVal(titleIdx, "無題のイベント");
        const location = getVal(locationIdx, "場所未定");
        
        // 不要なダミー文言・システム確認回答を除去するヘルパー関数
        const cleanText = (text) => {
            if (!text) return "";
            const trimmed = text.trim();
            const ignoreList = ["はい、わかりました", "はい", "いいえ", "わかりました", "了解しました", "ok", "無し", "なし", "特になし", "特になし。"];
            if (ignoreList.includes(trimmed.toLowerCase())) {
                return "";
            }
            return text;
        };

        // 各種追加設問項目の取得とクリーンアップ
        const eventContent = cleanText(getVal(descIdx));
        const recommendText = cleanText(getVal(recommendIdx));
        const targetText = cleanText(getVal(targetUserIdx));
        const capacityText = cleanText(getVal(capacityIdx));
        const feeText = cleanText(getVal(feeIdx));
        const contactText = cleanText(getVal(contactIdx));
        const otherText = cleanText(getVal(otherIdx));

        // 詳細情報の構築
        let description = "";
        if (eventContent) description += `${eventContent}\n`;
        if (recommendText) description += `\n【おすすめ・アピールポイント】\n${recommendText}\n`;
        if (targetText) description += `\n【対象者・おすすめな方】\n${targetText}\n`;
        if (capacityText) description += `\n【定員】\n${capacityText}\n`;
        if (feeText) description += `\n【参加費】\n${feeText}\n`;
        if (contactText) description += `\n【お申込先】\n${contactText}\n`;
        if (otherText) description += `\n【その他】\n${otherText}\n`;

        description = description.trim() || "詳細情報はありません。";

        // 校区の推測
        let district = getVal(districtIdx);
        if (!district || district === "未特定校区" || districtIdx === -1) {
            const combinedText = (title + " " + location + " " + description).toLowerCase();
            const schoolDistricts = ["城南", "別府", "金山", "七隈", "荒江", "飯倉", "鳥飼", "堤", "片江", "長尾", "梅林", "堤丘", "南片江", "田島"];
            const found = schoolDistricts.find(d => combinedText.includes(d.toLowerCase()));
            district = found ? `${found}校区` : "城南区";
        }

        parsedEvents.push({
            id: `sheet-${i}`,
            district: district,
            title: title,
            date: formattedDate,
            time: getVal(timeIdx, "時間未定"),
            location: location,
            description: description,
            status: "未着手"
        });
    }

    if (parsedEvents.length > 0) {
        events = parsedEvents;
    }
}
