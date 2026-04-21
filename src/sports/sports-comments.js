import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL =
  window.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ksvdequymkceevocgpdj.supabase.co";

const SUPABASE_ANON_KEY =
  window.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_bRhd0yC-gBTWTPC26IZHlw_sda85zos";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class SportsComments {
  constructor(options = {}) {
    this.supabase = options.supabase || supabase;
    this.contentType = options.contentType || "sports";
    this.contentId = options.contentId || null;

    this.listEl = this.resolveEl(options.listEl || "#commentList");
    this.inputEl = this.resolveEl(options.inputEl || "#commentInput");
    this.buttonEl = this.resolveEl(options.buttonEl || "#commentBtn");
    this.countEl = this.resolveEl(options.countEl || "#postComments");
    this.statusEl = this.resolveEl(options.statusEl || "#statusBox");

    this.comments = [];
    this.currentUser = null;
    this.channel = null;
    this.isLoading = false;
  }

  resolveEl(value) {
    if (!value) return null;
    if (typeof value === "string") return document.querySelector(value);
    return value;
  }

  setContentId(contentId) {
    this.contentId = contentId;
  }

  setStatus(message, type = "normal") {
    if (!this.statusEl) return;

    this.statusEl.textContent = message;
    this.statusEl.style.color =
      type === "error"
        ? "#ffd7d7"
        : type === "success"
          ? "#ddffea"
          : "var(--muted, #98b7ab)";

    this.statusEl.style.borderColor =
      type === "error"
        ? "rgba(255,127,127,.24)"
        : type === "success"
          ? "rgba(103,243,158,.24)"
          : "var(--line, rgba(103,243,158,.12))";

    this.statusEl.style.background =
      type === "error"
        ? "rgba(255,127,127,.08)"
        : type === "success"
          ? "rgba(103,243,158,.08)"
          : "rgba(255,255,255,.04)";
  }

  escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  formatDate(value) {
    if (!value) return "recent";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "recent";
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  async loadUser() {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) {
      console.error("[sports-comments] auth error:", error);
      this.currentUser = null;
      return null;
    }
    this.currentUser = data?.user || null;
    return this.currentUser;
  }

  async fetchComments() {
    if (!this.contentId) {
      this.comments = [];
      this.render();
      return [];
    }

    this.isLoading = true;

    const { data, error } = await this.supabase
      .from("comments")
      .select("*")
      .eq("content_type", this.contentType)
      .eq("content_id", this.contentId)
      .order("created_at", { ascending: false });

    this.isLoading = false;

    if (error) {
      console.error("[sports-comments] fetch error:", error);
      this.setStatus(error.message || "Could not load comments.", "error");
      this.comments = [];
      this.render();
      return [];
    }

    this.comments = data || [];
    this.render();
    return this.comments;
  }

  updateCount() {
    if (!this.countEl) return;
    this.countEl.textContent = String(this.comments.length);
  }

  renderEmpty(message = "No comments yet. Start the sports conversation.") {
    if (!this.listEl) return;
    this.listEl.innerHTML = `
      <div class="empty">
        ${this.escapeHtml(message)}
      </div>
    `;
    this.updateCount();
  }

  render() {
    if (!this.listEl) return;

    if (!this.comments.length) {
      this.renderEmpty();
      return;
    }

    this.listEl.innerHTML = this.comments
      .map((row) => {
        const displayName =
          row.user_name ||
          row.user_email ||
          row.author_name ||
          "Sports Fan";

        return `
          <article class="comment-card" data-comment-id="${this.escapeHtml(row.id)}">
            <strong>${this.escapeHtml(displayName)}</strong>
            <span>${this.escapeHtml(row.body || "")}</span>
            <span style="margin-top:8px;opacity:.78;">${this.escapeHtml(this.formatDate(row.created_at))}</span>
          </article>
        `;
      })
      .join("");

    this.updateCount();
  }

  async postComment(rawBody) {
    if (!this.contentId) {
      this.setStatus("No sports post selected for comments.", "error");
      return null;
    }

    const body = String(
      rawBody != null ? rawBody : this.inputEl?.value || ""
    ).trim();

    if (!body) {
      this.setStatus("Write a comment first.", "error");
      return null;
    }

    const user = this.currentUser || (await this.loadUser());

    if (!user) {
      this.setStatus("Sign in before posting a sports comment.", "error");
      return null;
    }

    const payload = {
      user_id: user.id,
      user_email: user.email || null,
      content_type: this.contentType,
      content_id: this.contentId,
      body
    };

    if (this.buttonEl) {
      this.buttonEl.disabled = true;
      this.buttonEl.textContent = "Posting...";
    }

    const { data, error } = await this.supabase
      .from("comments")
      .insert(payload)
      .select()
      .single();

    if (this.buttonEl) {
      this.buttonEl.disabled = false;
      this.buttonEl.textContent = "Post Comment";
    }

    if (error) {
      console.error("[sports-comments] insert error:", error);
      this.setStatus(error.message || "Could not post sports comment.", "error");
      return null;
    }

    if (this.inputEl) this.inputEl.value = "";

    this.comments = [data, ...this.comments];
    this.render();
    this.setStatus("Sports comment posted.", "success");
    return data;
  }

  subscribeRealtime() {
    if (!this.contentId) return;
    this.unsubscribeRealtime();

    this.channel = this.supabase
      .channel(`sports-comments-${this.contentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `content_type=eq.${this.contentType}`
        },
        async (payload) => {
          const row = payload.new || payload.old;
          if (!row) return;
          if (String(row.content_id) !== String(this.contentId)) return;
          await this.fetchComments();
        }
      )
      .subscribe();
  }

  unsubscribeRealtime() {
    if (!this.channel) return;
    this.supabase.removeChannel(this.channel);
    this.channel = null;
  }

  bind() {
    if (this.buttonEl) {
      this.buttonEl.addEventListener("click", () => this.postComment());
    }

    if (this.inputEl) {
      this.inputEl.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          this.postComment();
        }
      });
    }
  }

  async init() {
    await this.loadUser();
    this.bind();
    await this.fetchComments();
    this.subscribeRealtime();
    return this;
  }

  destroy() {
    this.unsubscribeRealtime();
  }
}

export function createSportsComments(options = {}) {
  return new SportsComments(options);
}

/*
USAGE EXAMPLE:

<script type="module">
  import { createSportsComments } from "/src/sports/sports-comments.js";

  const params = new URLSearchParams(window.location.search);
  const contentId = params.get("id");

  const comments = createSportsComments({
    contentType: "sports",
    contentId,
    listEl: "#commentList",
    inputEl: "#commentInput",
    buttonEl: "#commentBtn",
    countEl: "#postComments",
    statusEl: "#statusBox"
  });

  await comments.init();
</script>
*/
