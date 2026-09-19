/* =========================================
   BIR ÖMÜR — SİTE SAHİBİ DÜZENLEME MODU
   =========================================
   Basit, sunucusuz bir düzenleme sistemi.
   Değişiklikler bu tarayıcının localStorage'ında saklanır.
   ÖNEMLİ: Bu, ziyaretçiler arasında paylaşılmaz — yalnızca
   düzenlemeyi yaptığınız tarayıcı/cihazda görünür. Değişiklikleri
   tüm ziyaretçilere yansıtmak için dosyaları bu tarayıcıdan
   dışa aktarıp siteyi yeniden yayınlamanız gerekir (aşağıdaki
   "Değişiklikleri Dışa Aktar" düğmesi ile HTML'e gömülü hale
   getirebilirsiniz).
   ========================================= */

(function () {
    // Basit erişim şifresi — bunu kendi şifrenizle değiştirin.
    const ADMIN_PASSWORD = "birOmur2026";
    const SESSION_KEY = "biromur_admin_session";
    const TEXT_PREFIX = "biromur_text:";
    const IMG_PREFIX = "biromur_img:";
    const BLOCK_PREFIX = "biromur_blocks:";
    const MAX_IMG_SIZE = 3 * 1024 * 1024;

    let editMode = false;

    function toast(msg) {
        let el = document.querySelector(".admin-toast");
        if (!el) {
            el = document.createElement("div");
            el.className = "admin-toast";
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.classList.add("show");
        clearTimeout(el._t);
        el._t = setTimeout(() => el.classList.remove("show"), 2200);
    }

    function isAuthed() {
        return sessionStorage.getItem(SESSION_KEY) === "true";
    }

    function showUploadedImage(img) {
        img.style.display = "block";
        const wrap = img.closest(".img-edit-wrap");
        if (wrap) {
            const placeholder = wrap.querySelector("[data-role='placeholder']");
            if (placeholder) placeholder.style.display = "none";
        }
    }

    /* =========================================
       SERBEST İÇERİK BLOKLARI (BLOCK GROUPS)
       =========================================
       Bir sayfada [data-block-group="..."] taşıyan bir kapsayıcı,
       PowerPoint/Word'e benzer şekilde sınırsız sayıda görsel ve
       metin bloğu eklenmesine izin verir. Her grup kendi JSON
       dizisini localStorage'da tutar. Ziyaretçi görünümünde hiç
       blok yoksa kapsayıcı tamamen boş kalır — boş bir kutu
       görünmez.
       ========================================= */

    function getDefaultBlocks(groupId) {
        if (groupId === "upcoming-events") {
            return [
                { type: "event", date: "Yakında", title: "Yeni etkinlik detayları yakında burada paylaşılacak." }
            ];
        }
        return [];
    }

    function getBlocks(groupId) {
        try {
            const raw = localStorage.getItem(BLOCK_PREFIX + groupId);
            if (raw !== null) return JSON.parse(raw);
        } catch (e) {
            /* fall through to default */
        }
        return getDefaultBlocks(groupId);
    }

    function saveBlocks(groupId, blocks) {
        try {
            localStorage.setItem(BLOCK_PREFIX + groupId, JSON.stringify(blocks));
        } catch (e) {
            alert("Kaydedilemedi (tarayıcı depolama alanı dolu olabilir).");
        }
    }

    function blockToHTML(block, index, total) {
        const controls = editMode
            ? `<div class="block-controls">
                ${index > 0 ? `<button type="button" data-action="up" data-index="${index}" aria-label="Yukarı taşı"><i class="fas fa-chevron-up"></i></button>` : ""}
                ${index < total - 1 ? `<button type="button" data-action="down" data-index="${index}" aria-label="Aşağı taşı"><i class="fas fa-chevron-down"></i></button>` : ""}
                <button type="button" data-action="delete" data-index="${index}" aria-label="Sil"><i class="fas fa-trash"></i></button>
               </div>`
            : "";

        if (block.type === "image") {
            return `<div class="content-block content-block-image" data-index="${index}">
                <img src="${block.src}" alt="">
                ${controls}
            </div>`;
        }

        if (block.type === "event") {
            return `<div class="content-block content-block-event" data-index="${index}">
                <div class="event-date" data-field="date"${editMode ? ' contenteditable="true"' : ""}>${block.date || ""}</div>
                <div class="event-title" data-field="title"${editMode ? ' contenteditable="true"' : ""}>${block.title || ""}</div>
                ${controls}
            </div>`;
        }

        return `<div class="content-block content-block-text" data-index="${index}">
            <div class="block-body"${editMode ? ' contenteditable="true"' : ""}>${block.html}</div>
            ${controls}
        </div>`;
    }

    function renderBlockGroup(container) {
        const groupId = container.getAttribute("data-block-group");
        const allowedTypes = (container.getAttribute("data-block-types") || "image,text")
            .split(",")
            .map((t) => t.trim());
        const blocks = getBlocks(groupId);

        let html = blocks.map((b, i) => blockToHTML(b, i, blocks.length)).join("");

        if (editMode) {
            let addButtons = "";
            if (allowedTypes.includes("image")) {
                addButtons += `<button type="button" class="add-block-btn" data-add="image"><i class="fas fa-image"></i> <span class="tr">Görsel Ekle</span><span class="nl">Afbeelding Toevoegen</span></button>`;
            }
            if (allowedTypes.includes("text")) {
                addButtons += `<button type="button" class="add-block-btn" data-add="text"><i class="fas fa-font"></i> <span class="tr">Metin Ekle</span><span class="nl">Tekst Toevoegen</span></button>`;
            }
            if (allowedTypes.includes("event")) {
                addButtons += `<button type="button" class="add-block-btn" data-add="event"><i class="fas fa-calendar-plus"></i> <span class="tr">Etkinlik Ekle</span><span class="nl">Evenement Toevoegen</span></button>`;
            }
            html += `<div class="add-block-bar">${addButtons}</div>`;
        }

        container.innerHTML = html;
        bindBlockGroupEvents(container, groupId);
    }

    function bindBlockGroupEvents(container, groupId) {
        if (!editMode) return;

        container.querySelectorAll(".block-body[contenteditable='true']").forEach((el) => {
            el.addEventListener("blur", () => {
                const idx = parseInt(el.closest(".content-block").getAttribute("data-index"), 10);
                const blocks = getBlocks(groupId);
                if (blocks[idx]) {
                    blocks[idx].html = el.innerHTML;
                    saveBlocks(groupId, blocks);
                    toast("Metin kaydedildi.");
                }
            });
        });

        container.querySelectorAll(".event-date[contenteditable='true'], .event-title[contenteditable='true']").forEach((el) => {
            el.addEventListener("blur", () => {
                const idx = parseInt(el.closest(".content-block").getAttribute("data-index"), 10);
                const field = el.getAttribute("data-field");
                const blocks = getBlocks(groupId);
                if (blocks[idx]) {
                    blocks[idx][field] = el.innerHTML;
                    saveBlocks(groupId, blocks);
                    toast("Etkinlik kaydedildi.");
                }
            });
        });

        container.querySelectorAll("[data-action]").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const action = btn.getAttribute("data-action");
                const idx = parseInt(btn.getAttribute("data-index"), 10);
                let blocks = getBlocks(groupId);

                if (action === "delete") {
                    if (!confirm("Bu içeriği silmek istediğinize emin misiniz?")) return;
                    blocks.splice(idx, 1);
                } else if (action === "up" && idx > 0) {
                    [blocks[idx - 1], blocks[idx]] = [blocks[idx], blocks[idx - 1]];
                } else if (action === "down" && idx < blocks.length - 1) {
                    [blocks[idx + 1], blocks[idx]] = [blocks[idx], blocks[idx + 1]];
                }

                saveBlocks(groupId, blocks);
                renderBlockGroup(container);
            });
        });

        const addBar = container.querySelector(".add-block-bar");
        if (addBar) {
            addBar.querySelectorAll(".add-block-btn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const type = btn.getAttribute("data-add");
                    if (type === "image") {
                        addImageBlock(container, groupId);
                    } else if (type === "event") {
                        addEventBlock(container, groupId);
                    } else {
                        addTextBlock(container, groupId);
                    }
                });
            });
        }
    }

    function addImageBlock(container, groupId) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.addEventListener("change", () => {
            const file = input.files[0];
            if (!file) return;
            if (file.size > MAX_IMG_SIZE) {
                alert("Görsel çok büyük. Lütfen 3MB'ın altında bir görsel seçin.");
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const blocks = getBlocks(groupId);
                blocks.push({ type: "image", src: reader.result });
                saveBlocks(groupId, blocks);
                renderBlockGroup(container);
                toast("Görsel eklendi.");
            };
            reader.readAsDataURL(file);
        });
        input.click();
    }

    function addTextBlock(container, groupId) {
        const blocks = getBlocks(groupId);
        blocks.push({ type: "text", html: "Yeni metin — buraya tıklayıp yazın…" });
        saveBlocks(groupId, blocks);
        renderBlockGroup(container);
        toast("Metin eklendi. Üzerine tıklayıp düzenleyebilirsiniz.");
    }

    function addEventBlock(container, groupId) {
        const blocks = getBlocks(groupId);
        blocks.push({ type: "event", date: "GG.AA.YYYY", title: "Yeni etkinlik başlığı" });
        saveBlocks(groupId, blocks);
        renderBlockGroup(container);
        toast("Etkinlik eklendi. Tarih ve başlığa tıklayıp düzenleyebilirsiniz.");
    }

    function refreshAllBlockGroups() {
        document.querySelectorAll("[data-block-group]").forEach(renderBlockGroup);
    }

    function applySavedContent() {
        // Text overrides
        document.querySelectorAll("[data-edit-id]").forEach((el) => {
            if (el.tagName === "IMG") return;
            const id = el.getAttribute("data-edit-id");
            const saved = localStorage.getItem(TEXT_PREFIX + id);
            if (saved !== null) el.innerHTML = saved;
        });
        // Image overrides
        document.querySelectorAll("img[data-edit-id]").forEach((img) => {
            const id = img.getAttribute("data-edit-id");
            const saved = localStorage.getItem(IMG_PREFIX + id);
            if (saved) {
                img.src = saved;
                showUploadedImage(img);
            }
        });

        refreshAllBlockGroups();
    }

    function enterEditMode() {
        editMode = true;
        document.body.classList.add("edit-mode");
        document.getElementById("admin-bar").classList.add("active");

        document.querySelectorAll("[data-edit-id]").forEach((el) => {
            if (el.tagName === "IMG") return;
            el.setAttribute("contenteditable", "true");
            el.addEventListener("blur", onTextEdited);
        });

        document.querySelectorAll(".img-edit-wrap").forEach((wrap) => {
            wrap.addEventListener("click", onImageWrapClick);
        });

        refreshAllBlockGroups();

        toast("Düzenleme modu açık. Metinlere tıklayıp yazabilir, görsellere tıklayıp değiştirebilirsiniz.");
    }

    function exitEditMode() {
        editMode = false;
        document.body.classList.remove("edit-mode");
        document.getElementById("admin-bar").classList.remove("active");

        document.querySelectorAll("[data-edit-id]").forEach((el) => {
            if (el.tagName === "IMG") return;
            el.removeAttribute("contenteditable");
            el.removeEventListener("blur", onTextEdited);
        });
        document.querySelectorAll(".img-edit-wrap").forEach((wrap) => {
            wrap.removeEventListener("click", onImageWrapClick);
        });

        refreshAllBlockGroups();
    }

    function onTextEdited(e) {
        const el = e.target;
        const id = el.getAttribute("data-edit-id");
        localStorage.setItem(TEXT_PREFIX + id, el.innerHTML);
        toast("Metin kaydedildi.");
    }

    function onImageWrapClick(e) {
        const wrap = e.currentTarget;
        const img = wrap.querySelector("img[data-edit-id]");
        if (!img) return;
        const id = img.getAttribute("data-edit-id");

        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.addEventListener("change", () => {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 3 * 1024 * 1024) {
                alert("Görsel çok büyük. Lütfen 3MB'ın altında bir görsel seçin.");
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    localStorage.setItem(IMG_PREFIX + id, reader.result);
                    img.src = reader.result;
                    showUploadedImage(img);
                    toast("Görsel kaydedildi.");
                } catch (err) {
                    alert("Görsel kaydedilemedi (tarayıcı depolama alanı dolu olabilir).");
                }
            };
            reader.readAsDataURL(file);
        });
        input.click();
    }

    function exportChanges() {
        const data = {};
        Object.keys(localStorage)
            .filter((k) => k.startsWith(TEXT_PREFIX) || k.startsWith(IMG_PREFIX) || k.startsWith(BLOCK_PREFIX))
            .forEach((k) => (data[k] = localStorage.getItem(k)));

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "biromur-degisiklikler.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast("Değişiklikler indirildi.");
    }

    function importChanges() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.addEventListener("change", () => {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    Object.keys(data).forEach((k) => {
                        if (k.startsWith(TEXT_PREFIX) || k.startsWith(IMG_PREFIX) || k.startsWith(BLOCK_PREFIX)) {
                            localStorage.setItem(k, data[k]);
                        }
                    });
                    toast("İçe aktarıldı. Sayfa yenileniyor…");
                    setTimeout(() => location.reload(), 800);
                } catch (err) {
                    alert("Dosya okunamadı. Geçerli bir yedek dosyası seçin.");
                }
            };
            reader.readAsText(file);
        });
        input.click();
    }

    function resetAll() {
        if (!confirm("Tüm özel metin ve görsel değişiklikleri sıfırlanacak. Emin misiniz?")) return;
        Object.keys(localStorage)
            .filter((k) => k.startsWith(TEXT_PREFIX) || k.startsWith(IMG_PREFIX) || k.startsWith(BLOCK_PREFIX))
            .forEach((k) => localStorage.removeItem(k));
        toast("Sıfırlandı. Sayfa yenileniyor…");
        setTimeout(() => location.reload(), 800);
    }

    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
        exitEditMode();
        toast("Çıkış yapıldı.");
    }

    function buildAdminBar() {
        const bar = document.createElement("div");
        bar.id = "admin-bar";
        bar.innerHTML = `
            <div class="admin-status"><i class="fas fa-pen"></i> Düzenleme Modu</div>
            <div class="admin-actions">
                <button id="admin-export-btn" type="button">Değişiklikleri Dışa Aktar</button>
                <button id="admin-import-btn" type="button">İçe Aktar</button>
                <button id="admin-exit-btn" type="button">Düzenlemeyi Bitir</button>
                <button id="admin-reset-btn" type="button" class="danger">Tüm Değişiklikleri Sıfırla</button>
                <button id="admin-logout-btn" type="button" class="danger">Çıkış Yap</button>
            </div>
        `;
        document.body.appendChild(bar);

        bar.querySelector("#admin-export-btn").addEventListener("click", exportChanges);
        bar.querySelector("#admin-import-btn").addEventListener("click", importChanges);
        bar.querySelector("#admin-exit-btn").addEventListener("click", exitEditMode);
        bar.querySelector("#admin-reset-btn").addEventListener("click", resetAll);
        bar.querySelector("#admin-logout-btn").addEventListener("click", logout);
    }

    function buildToggleButton() {
        const btn = document.createElement("button");
        btn.id = "admin-toggle-btn";
        btn.type = "button";
        btn.setAttribute("aria-label", "Site sahibi düzenleme modu");
        btn.innerHTML = '<i class="fas fa-lock"></i>';
        document.body.appendChild(btn);

        btn.addEventListener("click", () => {
            if (editMode) {
                exitEditMode();
                return;
            }
            if (isAuthed()) {
                enterEditMode();
                return;
            }
            const pw = prompt("Site sahibi şifresini girin:");
            if (pw === null) return;
            if (pw === ADMIN_PASSWORD) {
                sessionStorage.setItem(SESSION_KEY, "true");
                enterEditMode();
            } else {
                alert("Şifre hatalı.");
            }
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        applySavedContent();
        buildAdminBar();
        buildToggleButton();
    });
})();
