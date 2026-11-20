const previewCache = new Map();

function linkifyPosts() {
        document.querySelectorAll('p.text').forEach((currentPost) => {
        if (!currentPost) return;
        if (currentPost.querySelector('a')) return;

        const text = currentPost.textContent;
        const parts = [];
        const cards = document.createElement("div");
        cards.className = "mini-x-url-cards";
        let cursor = 0;
        
        for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
            const url = match[0];
            // 前回のURLの終わりから、今回のURLの手前まで
            parts.push(text.slice(cursor, match.index));
            
            const link = document.createElement("a");
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = url;

            const card = document.createElement("a");
            card.className = "mini-x-url-card";
            card.href = url;
            card.target = "_blank";
            card.rel = "noopener noreferrer";

            const thumbnail = document.createElement("span");
            thumbnail.className = "mini-x-url-thumbnail";
            thumbnail.setAttribute("aria-hidden", "true");

            const info = document.createElement("span");
            info.className = "mini-x-url-info";

            const domain = document.createElement("span");
            domain.className = "mini-x-url-domain";
            domain.textContent = new URL(url).hostname;

            const titleText = document.createElement("span");
            titleText.className = "mini-x-url-title";
            titleText.textContent = url;

            info.append(domain, titleText);
            card.append(thumbnail, info);
            cards.append(card);

            if (new URL(url).protocol === "https:") {
            fetchPreview(url)
                .then((preview) => {
                    if (!card.isConnected) return;

                    if (preview.title) {
                    titleText.textContent = preview.title;
                    }

                    if (!preview.imageUrl) return;

                    const imageUrl = new URL(preview.imageUrl);
                    if (imageUrl.protocol !== "https:") return;

                    const image = document.createElement("img");
                    image.alt = "";
                    image.loading = "lazy";
                    image.referrerPolicy = "no-referrer";

                    image.addEventListener("error", () => image.remove(), {
                    once: true,
                    });

                    image.src = imageUrl.href;
                    thumbnail.replaceChildren(image);
                })
                .catch(console.error);
            }

            parts.push(link);
            
            // 次の切り出しを始める位置
            cursor = match.index + url.length;
        }
        if (parts.length === 0) return;
        // 最後のURLより後ろの文章
        parts.push(text.slice(cursor));

        currentPost.replaceChildren(...parts);
        currentPost.after(cards);
    });
}

const postObserver = new MutationObserver(linkifyPosts);

postObserver.observe(document.body, {
    childList: true,
    subtree: true,
});

linkifyPosts();

async function requestPreview(url) {
    const result = await chrome.runtime.sendMessage({
        type: "fetchPage",
        url: url,
    });

    if (result.error) {
        throw new Error(result.error);
    }

    const page = new DOMParser().parseFromString(result.html, "text/html");
    const imageUrl = page
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content");

    return {
        title: page.title.trim(),
        imageUrl: imageUrl,
    };
}

function fetchPreview(url) {
    const key = new URL(url).href;

    if (previewCache.has(key)) {
        return previewCache.get(key);
    }

    console.log("プレビュー取得開始:", key);

    const pending = requestPreview(key).catch((error) => {
        // 失敗した結果は残さず、次回に再試行できるようにする
        previewCache.delete(key);
        throw error;
    });

    previewCache.set(key, pending);
    return pending;
}