export function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : structuredClone(value);
}

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const LOCALIZATION_KEY = /^(?:HB|HBDND5E|HBAE|HBAEDND)\./;

export function localizeText(value, lang = globalThis.game?.i18n?.lang ?? "en") {
  if (typeof value === "string") {
    if (!LOCALIZATION_KEY.test(value)) return value;
    const translated = globalThis.game?.i18n?.localize?.(value);
    return translated && translated !== value ? translated : value;
  }
  if (!value || typeof value !== "object") return String(value ?? "");
  if (typeof value.key === "string") return localizeText(value.key, lang);
  const selected = value[lang] ?? value.en ?? Object.values(value).find(entry => typeof entry === "string");
  return selected === undefined ? "" : localizeText(selected, lang);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function notify(level, message) {
  const notifications = globalThis.ui?.notifications;
  (notifications?.[level] ?? notifications?.info)?.call(notifications, message);
}

export function moduleLog(...args) {
  console.log("hunters-bestiary-dnd5e-2024 |", ...args);
}

export function moduleError(...args) {
  console.error("hunters-bestiary-dnd5e-2024 |", ...args);
}
