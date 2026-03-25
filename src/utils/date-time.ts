export function getRemainingTime(expireAt: Date) {
    const now = new Date().getTime();
    const expire = new Date(expireAt).getTime();

    const diff = expire - now;

    if (diff <= 0) return "expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

    return `${days} روز و ${hours} ساعت`;
}