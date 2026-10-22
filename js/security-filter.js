
/**
 * C500 AI Assistant — Dynamic Security Filter
 *
 * Firestore document:
 *   system_settings/security_filter
 *
 * Document format:
 *   {
 *     keywords: [
 *       { term: "từ khóa", enabled: true }
 *     ],
 *     updatedAt: server timestamp,
 *     updatedBy: "admin email"
 *   }
 *
 * Yêu cầu Firebase compat SDK + firebase-config.js được tải trước.
 */

(() => {
    "use strict";

    const CONFIG_COLLECTION = "system_settings";
    const CONFIG_DOCUMENT = "security_filter";
    const ADMIN_EMAIL = "nguyenduongbaominh2006@gmail.com";

    const DEFAULT_KEYWORDS = [
        "gián điệp",
        "mật mã",
        "trinh sát",
        "tội phạm",
        "biện pháp nghiệp vụ",
        "biểu tình",
        "tụ tập đông người",
        "bạo loạn",
        "gây rối trật tự",
        "biểu tình 2015",
        "biểu tình 2016",
        "biểu tình 2017",
        "biểu tình 2018",
        "biểu tình 2019",
        "biểu tình 2020",
        "biểu tình 2021",
        "biểu tình 2022",
        "biểu tình 2023",
        "biểu tình 2024",
        "biểu tình 2025",
        "biểu tình 2026",
        "formosa",
        "luật đặc khu",
        "an ninh mạng biểu tình",
        "kích động"
    ];

    let keywordEntries = DEFAULT_KEYWORDS.map((term) => ({
        term,
        enabled: true
    }));

    let configLoaded = false;
    let unsubscribeConfig = null;
    let unsubscribeAuth = null;
    let isAdmin = false;
    let saving = false;
    let panelInitialized = false;

    const listeners = new Set();

    function normalizeText(value) {
        return String(value ?? "")
            .normalize("NFC")
            .toLocaleLowerCase("vi-VN")
            .replace(/\s+/g, " ")
            .trim();
    }

    function cleanTerm(value) {
        return String(value ?? "")
            .normalize("NFC")
            .replace(/\s+/g, " ")
            .trim();
    }

    function notifyListeners() {
        listeners.forEach((callback) => {
            try {
                callback(getSecurityKeywords());
            } catch (error) {
                console.error("Security filter listener error.");
            }
        });
    }

    function getSecurityKeywords() {
        return keywordEntries.map((entry) => ({ ...entry }));
    }

    function getEnabledKeywords() {
        return keywordEntries
            .filter((entry) => entry.enabled)
            .map((entry) => entry.term);
    }

    /**
     * Trả về từ khóa đầu tiên khớp, giữ tương thích với code cũ.
     * Không có kết quả thì trả về undefined.
     */
    function checkSecurityViolation(text) {
        const normalized = normalizeText(text);
        if (!normalized) return undefined;

        const found = keywordEntries.find((entry) => {
            return entry.enabled &&
                normalized.includes(normalizeText(entry.term));
        });

        return found ? found.term : undefined;
    }

    /**
     * Lấy tất cả từ khóa khớp để giao diện có thể giải thích
     * vì sao nội dung được đưa vào diện rà soát.
     */
    function getSecurityMatches(text) {
        const normalized = normalizeText(text);
        if (!normalized) return [];

        return keywordEntries
            .filter((entry) =>
                entry.enabled &&
                normalized.includes(normalizeText(entry.term))
            )
            .map((entry) => entry.term);
    }

    function onSecurityKeywordsChanged(callback) {
        if (typeof callback !== "function") {
            return () => {};
        }

        listeners.add(callback);
        return () => listeners.delete(callback);
    }

    function sortEntries(entries) {
        return entries.sort((a, b) =>
            a.term.localeCompare(b.term, "vi")
        );
    }

    function parseRemoteEntries(data) {
        if (!data || !Array.isArray(data.keywords)) {
            return null;
        }

        const seen = new Set();
        const result = [];

        data.keywords.forEach((item) => {
            // Hỗ trợ cả định dạng cũ: ["từ khóa", ...]
            const term = cleanTerm(
                typeof item === "string" ? item : item?.term
            );

            if (!term || term.length > 120) return;

            const key = normalizeText(term);
            if (seen.has(key)) return;

            seen.add(key);

            result.push({
                term,
                enabled: typeof item === "string"
                    ? true
                    : item.enabled !== false
            });
        });

        return sortEntries(result);
    }

    function getConfigRef() {
        if (typeof db === "undefined") {
            throw new Error("Firebase Firestore chưa được khởi tạo.");
        }

        return db.collection(CONFIG_COLLECTION).doc(CONFIG_DOCUMENT);
    }

    function setEntries(entries) {
        keywordEntries = sortEntries(entries.map((entry) => ({
            term: cleanTerm(entry.term),
            enabled: entry.enabled !== false
        })));

        notifyListeners();
        renderAdminPanel();
    }

    function startConfigListener() {
        if (unsubscribeConfig) {
            unsubscribeConfig();
            unsubscribeConfig = null;
        }

        if (typeof db === "undefined") return;

        try {
            unsubscribeConfig = getConfigRef().onSnapshot(
                (snapshot) => {
                    if (snapshot.exists) {
                        const parsed = parseRemoteEntries(snapshot.data());

                        if (parsed) {
                            setEntries(parsed);
                        }
                    }

                    // Nếu tài liệu chưa tồn tại, tiếp tục dùng danh sách
                    // mặc định cho đến khi quản trị viên lưu cấu hình.
                    configLoaded = true;
                    renderAdminPanel();
                },
                (error) => {
                    configLoaded = true;
                    console.error(
                        "Không thể đồng bộ cấu hình security filter:",
                        error.code || "unknown"
                    );
                    renderAdminPanel();
                }
            );
        } catch (error) {
            configLoaded = true;
            console.error("Không thể khởi tạo security filter.");
        }
    }

    async function saveEntries(entries) {
        if (!isAdmin) {
            throw new Error("Bạn không có quyền quản lý bộ lọc.");
        }

        if (saving) {
            throw new Error("Đang lưu cấu hình. Vui lòng chờ.");
        }

        const cleaned = parseRemoteEntries({
            keywords: entries
        });

        if (!cleaned) {
            throw new Error("Danh sách từ khóa không hợp lệ.");
        }

        if (cleaned.length > 500) {
            throw new Error("Chỉ được lưu tối đa 500 từ khóa.");
        }

        saving = true;
        renderAdminPanel();

        try {
            await getConfigRef().set({
                keywords: cleaned,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: auth.currentUser?.email || ""
            }, { merge: true });

            setEntries(cleaned);
            return true;
        } finally {
            saving = false;
            renderAdminPanel();
        }
    }

    // ---------------- UI QUẢN LÝ ----------------

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;

        return element;
    }

    function panelMessage(message, isError = false) {
        const box = document.getElementById("sf-admin-message");
        if (!box) return;

        box.textContent = message;
        box.className = isError
            ? "sf-message sf-error"
            : "sf-message sf-success";
    }

    function injectPanelStyles() {
        if (document.getElementById("sf-admin-styles")) return;

        const style = document.createElement("style");
        style.id = "sf-admin-styles";

        style.textContent = `
            #sf-admin-panel {
                margin: 24px 0;
                padding: 22px;
                border: 1px solid rgba(16,185,129,.35);
                border-radius: 18px;
                background: #0f172a;
                color: #e2e8f0;
                font-family: Arial, sans-serif;
            }
            #sf-admin-panel * { box-sizing: border-box; }
            #sf-admin-panel h2 {
                font-size: 19px;
                font-weight: 800;
                color: #facc15;
                margin: 0 0 8px;
            }
            #sf-admin-panel .sf-muted {
                color: #94a3b8;
                font-size: 12px;
                line-height: 1.6;
            }
            #sf-admin-panel .sf-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: 16px 0;
            }
            #sf-admin-panel input[type="text"],
            #sf-admin-panel input[type="search"] {
                min-width: 0;
                width: 100%;
                padding: 11px 12px;
                color: #f8fafc;
                background: #020617;
                border: 1px solid #334155;
                border-radius: 10px;
                outline: none;
            }
            #sf-admin-panel input:focus {
                border-color: #10b981;
            }
            #sf-admin-panel button {
                border: 0;
                border-radius: 9px;
                padding: 10px 13px;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
            }
            #sf-admin-panel button:disabled {
                opacity: .55;
                cursor: not-allowed;
            }
            #sf-admin-panel .sf-primary {
                background: #059669;
                color: white;
            }
            #sf-admin-panel .sf-secondary {
                background: #334155;
                color: white;
            }
            #sf-admin-panel .sf-danger {
                background: #7f1d1d;
                color: #fecaca;
            }
            #sf-admin-panel .sf-list {
                display: grid;
                gap: 8px;
                margin-top: 12px;
            }
            #sf-admin-panel .sf-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 11px;
                border: 1px solid #334155;
                border-radius: 12px;
                background: #020617;
            }
            #sf-admin-panel .sf-term {
                flex: 1;
                min-width: 0;
                overflow-wrap: anywhere;
                font-size: 13px;
            }
            #sf-admin-panel .sf-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }
            #sf-admin-panel .sf-enabled {
                color: #6ee7b7;
                font-size: 10px;
            }
            #sf-admin-panel .sf-disabled {
                color: #fca5a5;
                font-size: 10px;
            }
            #sf-admin-panel .sf-message {
                margin-top: 12px;
                padding: 10px 12px;
                border-radius: 10px;
                font-size: 12px;
                line-height: 1.6;
                overflow-wrap: anywhere;
            }
            #sf-admin-panel .sf-success {
                color: #bbf7d0;
                background: #052e16;
            }
            #sf-admin-panel .sf-error {
                color: #fecaca;
                background: #450a0a;
            }
            #sf-admin-panel .sf-count {
                color: #cbd5e1;
                font-size: 12px;
                margin-top: 12px;
            }
            @media (max-width: 520px) {
                #sf-admin-panel { padding: 15px; }
                #sf-admin-panel .sf-item {
                    align-items: flex-start;
                    flex-wrap: wrap;
                }
                #sf-admin-panel .sf-actions {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function createAdminPanel() {
        if (panelInitialized || !document.body) return;

        panelInitialized = true;
        injectPanelStyles();

        const panel = createElement("section");
        panel.id = "sf-admin-panel";
        panel.setAttribute("aria-label", "Quản lý bộ lọc an toàn");

        const heading = createElement("h2", "", "Quản lý bộ lọc từ khóa");
        const description = createElement(
            "p",
            "sf-muted",
            "Thêm, tìm kiếm, bật/tắt hoặc xóa từ khóa. Cấu hình được đồng bộ qua Firestore."
        );

        const message = createElement("div");
        message.id = "sf-admin-message";
        message.className = "sf-message";
        message.hidden = true;

        const addForm = createElement("form", "sf-toolbar");
        addForm.id = "sf-add-form";

        const addInput = createElement("input");
        addInput.type = "text";
        addInput.id = "sf-new-term";
        addInput.placeholder = "Nhập từ khóa mới...";
        addInput.maxLength = 120;
        addInput.setAttribute("aria-label", "Từ khóa mới");
        addInput.required = true;
        addInput.style.flex = "1 1 220px";

        const addButton = createElement("button", "sf-primary", "Thêm từ khóa");
        addButton.type = "submit";

        addForm.append(addInput, addButton);

        const searchInput = createElement("input");
        searchInput.type = "search";
        searchInput.id = "sf-search";
        searchInput.placeholder = "Tìm từ khóa...";
        searchInput.setAttribute("aria-label", "Tìm từ khóa");
        searchInput.style.marginBottom = "12px";

        const count = createElement("p", "sf-count");
        count.id = "sf-count";

        const list = createElement("div", "sf-list");
        list.id = "sf-list";
        list.setAttribute("aria-live", "polite");

        panel.append(heading, description, addForm, searchInput, count, list, message);

        // Không thay đổi cấu trúc admin.html hiện tại.
        // Chèn panel vào cuối trang khi người quản trị đã xác thực.
        document.body.appendChild(panel);

        addForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const term = cleanTerm(addInput.value);
            if (!term) {
                panelMessage("Hãy nhập từ khóa trước khi thêm.", true);
                return;
            }

            if (term.length > 120) {
                panelMessage("Từ khóa không được vượt quá 120 ký tự.", true);
                return;
            }

            if (keywordEntries.some(
                (entry) => normalizeText(entry.term) === normalizeText(term)
            )) {
                panelMessage("Từ khóa này đã tồn tại.", true);
                return;
            }

            try {
                await saveEntries([
                    ...keywordEntries,
                    { term, enabled: true }
                ]);

                addInput.value = "";
                panelMessage("Đã thêm từ khóa và đồng bộ cấu hình.");
            } catch (error) {
                panelMessage(
                    error.code === "permission-denied"
                        ? "Firebase từ chối quyền ghi. Hãy kiểm tra Firestore Security Rules."
                        : error.message || "Không thể lưu từ khóa.",
                    true
                );
            }
        });

        searchInput.addEventListener("input", renderAdminPanel);

        renderAdminPanel();
    }

    function renderAdminPanel() {
        const panel = document.getElementById("sf-admin-panel");
        if (!panel) return;

        const list = document.getElementById("sf-list");
        const count = document.getElementById("sf-count");
        const searchInput = document.getElementById("sf-search");
        if (!list || !count || !searchInput) return;

        list.replaceChildren();

        const query = normalizeText(searchInput.value);
        const filtered = keywordEntries.filter((entry) =>
            normalizeText(entry.term).includes(query)
        );

        count.textContent =
            `${filtered.length} kết quả · ${keywordEntries.length} từ khóa tổng cộng · ` +
            `${keywordEntries.filter((entry) => entry.enabled).length} đang bật`;

        if (!configLoaded) {
            count.textContent += " · Đang đồng bộ...";
        }

        if (filtered.length === 0) {
            list.appendChild(createElement(
                "p",
                "sf-muted",
                "Không tìm thấy từ khóa phù hợp."
            ));
            return;
        }

        filtered.forEach((entry) => {
            const item = createElement("div", "sf-item");
            const term = createElement("div", "sf-term", entry.term);
            const state = createElement(
                "div",
                entry.enabled ? "sf-enabled" : "sf-disabled",
                entry.enabled ? "ĐANG BẬT" : "ĐANG TẮT"
            );

            const actions = createElement("div", "sf-actions");

            const toggleButton = createElement(
                "button",
                "sf-secondary",
                entry.enabled ? "Tắt" : "Bật"
            );
            toggleButton.type = "button";
            toggleButton.disabled = saving;
            toggleButton.addEventListener("click", async () => {
                try {
                    await saveEntries(keywordEntries.map((item) =>
                        normalizeText(item.term) === normalizeText(entry.term)
                            ? { ...item, enabled: !item.enabled }
                            : item
                    ));

                    panelMessage("Đã cập nhật trạng thái từ khóa.");
                } catch (error) {
                    panelMessage(
                        error.code === "permission-denied"
                            ? "Không có quyền cập nhật. Hãy kiểm tra Security Rules."
                            : error.message || "Không thể cập nhật từ khóa.",
                        true
                    );
                }
            });

            const deleteButton = createElement("button", "sf-danger", "Xóa");
            deleteButton.type = "button";
            deleteButton.disabled = saving;
            deleteButton.addEventListener("click", async () => {
                const confirmed = window.confirm(
                    `Bạn có chắc muốn xóa từ khóa "${entry.term}"?`
                );

                if (!confirmed) return;

                try {
                    await saveEntries(keywordEntries.filter(
                        (item) =>
                            normalizeText(item.term) !== normalizeText(entry.term)
                    ));

                    panelMessage("Đã xóa từ khóa.");
                } catch (error) {
                    panelMessage(
                        error.code === "permission-denied"
                            ? "Không có quyền xóa. Hãy kiểm tra Security Rules."
                            : error.message || "Không thể xóa từ khóa.",
                        true
                    );
                }
            });

            actions.append(toggleButton, deleteButton);
            item.append(term, state, actions);
            list.appendChild(item);
        });
    }

    function showAdminPanelFor(user) {
        const allowed = Boolean(
            user &&
            user.email &&
            user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
        );

        isAdmin = allowed;

        if (allowed) {
            createAdminPanel();
        } else {
            const panel = document.getElementById("sf-admin-panel");
            if (panel) panel.remove();
            panelInitialized = false;
        }
    }

    function init() {
        if (typeof firebase === "undefined" ||
            typeof auth === "undefined" ||
            typeof db === "undefined") {
            console.error(
                "Security filter chưa khởi tạo: hãy tải Firebase SDK và firebase-config.js trước."
            );
            return;
        }

        startConfigListener();

        if (unsubscribeAuth) unsubscribeAuth();

        unsubscribeAuth = auth.onAuthStateChanged((user) => {
            showAdminPanelFor(user);
        });
    }

    // API toàn cục để index.html và các trang khác dùng chung.
    // Giữ tương thích với checkSecurityViolation(text) trong code cũ.
    window.checkSecurityViolation = checkSecurityViolation;
    window.getSecurityMatches = getSecurityMatches;
    window.getSecurityKeywords = getSecurityKeywords;
    window.getEnabledSecurityKeywords = getEnabledKeywords;
    window.onSecurityKeywordsChanged = onSecurityKeywordsChanged;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
