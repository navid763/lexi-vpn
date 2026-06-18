import axios, { type AxiosInstance } from "axios";
import crypto from "crypto";
import http from "http";
import https from "https";

// ─── Result type ──────────────────────────────────────────────────────────────

export interface XuiClientResult {
    uuid: string;
    email: string;
    subId: string;
    configUrl: string;
    subUrl: string;
}

// ─── Cached inbound settings ──────────────────────────────────────────────────

interface RealitySettings {
    port: number;
    publicKey: string;
    fingerprint: string;
    sni: string;
    shortId: string;
    spiderX: string;
}

let cachedReality: RealitySettings | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function env(key: string): string {
    const v = process.env[key];
    if (!v) throw new Error(`Missing required env var: ${key}`);
    return v;
}

function buildHttp(): AxiosInstance {
    return axios.create({
        baseURL: env("XUI_PANEL_URL"),
        validateStatus: () => true,

        // ۱. افزایش زمان تایم‌اوت به ۶۰ ثانیه برای تضمین دریافت پاسخ از سرور ایران
        timeout: 60000,

        httpAgent: new http.Agent({
            keepAlive: true,
            keepAliveMsecs: 4000,
        }),

        httpsAgent: new https.Agent({
            keepAlive: true,
            keepAliveMsecs: 4000,
            rejectUnauthorized: false,
        }),
        headers: {
            "Authorization": `Bearer ${env("XUI_API_TOKEN")}`,
            "Content-Type": "application/json",
            "Accept": "application/json",

            // ۲. فعال‌سازی فشرده‌سازی برای کوچک کردن حجم پکت‌های ارسالی آرایه کلاینت‌ها
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive"
        },
    });
}

async function getRealitySettings(): Promise<RealitySettings> {
    if (cachedReality) return cachedReality;

    const instance = buildHttp();
    const inboundId = Number(env("XUI_INBOUND_ID"));
    const res = await instance.get(`/panel/api/inbounds/get/${inboundId}`);

    if (!res.data?.success) {
        throw new Error(`3x-ui getInbound failed: ${JSON.stringify(res.data)}`);
    }

    const obj = res.data.obj;
    let streamSettings: any = {};
    if (typeof obj.streamSettings === "string") {
        streamSettings = JSON.parse(obj.streamSettings);
    } else if (typeof obj.streamSettings === "object") {
        streamSettings = obj.streamSettings;
    }

    const reality = streamSettings?.realitySettings;
    if (!reality) {
        throw new Error("3x-ui: inbound is not configured with Reality security");
    }

    const innerSettings = reality.settings || {};
    cachedReality = {
        port: obj.port,
        publicKey: innerSettings.publicKey || "",
        fingerprint: innerSettings.fingerprint || "chrome",
        sni: reality.serverNames?.[0] || "",
        shortId: reality.shortIds?.[0] || "",
        spiderX: innerSettings.spiderX || "/",
    };

    return cachedReality;
}

function buildVlessRealityUrl(uuid: string, email: string, reality: RealitySettings): string {
    const address = env("XUI_SERVER_ADDRESS");
    const params = new URLSearchParams({
        type: "tcp",
        security: "reality",
        pbk: reality.publicKey,
        fp: reality.fingerprint,
        sni: reality.sni,
        sid: reality.shortId,
        spx: reality.spiderX,
        flow: "xtls-rprx-vision",
    });
    return `vless://${uuid}@${address}:${reality.port}?${params.toString()}#${encodeURIComponent(email)}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export class XuiService {


    /**
      * Provisions a new client using the correct, native /api/clients/add endpoint.
      */
    static async addClient(
        trafficLimitBytes: number,
        expiryTimeMs: number,
        remark: string
    ): Promise<XuiClientResult> {
        const instance = buildHttp();
        const inboundId = Number(env("XUI_INBOUND_ID"));

        // ۱. تولید شناسه‌ها برای دیتابیس لوکال و لینک‌ها
        const uuid = crypto.randomUUID();
        const subId = crypto.randomBytes(8).toString("hex");
        const shortId = crypto.randomBytes(4).toString("hex");
        const email = `${remark.replace(/[^a-zA-Z0-9]/g, "")}_${shortId}`;

        // ۲. ساخت بدنه درخواست دقیقاً مطابق با ساختار مستندات پنل شما
        const payload = {
            client: {
                id: uuid,             // تزریق UUID سفارشی برای سازگاری با دیتابیس شما
                subId: subId,         // تزریق شناسه سابسکرایبشن سفارشی
                flow: "xtls-rprx-vision",
                email: email,
                totalGB: typeof trafficLimitBytes === "number" ? trafficLimitBytes : 0,
                expiryTime: typeof expiryTimeMs === "number" ? expiryTimeMs : 0,
                tgId: 0,
                limitIp: 0,
                group: "bot",
                enable: true
            },
            inboundIds: [inboundId]   // آرایه‌ای از آیدی اینباندهایی که کاربر باید به آن‌ها وصل شود
        };

        console.log(`[XuiService] Sending compliant client payload to /api/clients/add for: ${email}...`);

        // ۳. ارسال درخواست به اندپونت اصلی
        const response = await instance.post("/panel/api/clients/add", payload);

        if (!response.data?.success) {
            throw new Error(`Direct api/clients/add failed: ${JSON.stringify(response.data)}`);
        }

        console.log("✅ [XuiService] Client successfully created on panel via native clients/add endpoint.");

        // ۴. استخراج تنظیمات ریلیتی برای تولید خروجی‌ها
        const reality = await getRealitySettings();
        const configUrl = buildVlessRealityUrl(uuid, email, reality);
        const subUrl = `${env("XUI_SUB_URL")}/${subId}`;

        return { uuid, email, subId, configUrl, subUrl };
    }

    static async disableClient(uuid: string, email: string): Promise<void> {
        const instance = buildHttp();
        try {
            // استفاده از اندپوینت جدید حذف بر اساس ایمیل کلاینت
            await instance.post(`/panel/api/clients/del/${email}`);
            console.log(`🗑️ [XuiService] Client ${email} deleted from all inbounds.`);
        } catch (err) {
            console.error("[XuiService] disableClient via email failed:", err);
        }
    }

    static async warmup(): Promise<void> {
        try {
            await getRealitySettings();
        } catch (err) {
            console.error("[XuiService] warmup failed:", err);
            throw err;
        }
    }
}
