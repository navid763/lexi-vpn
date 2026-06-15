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
        timeout: 15000, // تعیین تایم‌اوت مشخص برای جلوگیری از معلق ماندن سوکت
        // استفاده از مأمورهای شبکه نیتیو برای زنده نگه داشتن اتصال و جلوگیری از ECONNRESET
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
            "Connection": "keep-alive" // اصرار به زنده نگه داشتن کانکشن
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
     * Safely adds a client by mutating the inbound schema with network safety wrappers
     */
    static async addClient(
        trafficLimitBytes: number,
        expiryTimeMs: number,
        remark: string
    ): Promise<XuiClientResult> {
        const instance = buildHttp();
        const inboundId = Number(env("XUI_INBOUND_ID"));

        // ۱. دریافت وضعیت کنونی اینباند
        const getRes = await instance.get(`/panel/api/inbounds/get/${inboundId}`);
        if (!getRes.data?.success || !getRes.data?.obj) {
            throw new Error(`Failed to fetch inbound state: ${JSON.stringify(getRes.data)}`);
        }

        const inboundObj = getRes.data.obj;

        let currentSettings: any = {};
        if (typeof inboundObj.settings === "string") {
            currentSettings = JSON.parse(inboundObj.settings);
        } else if (typeof inboundObj.settings === "object") {
            currentSettings = inboundObj.settings;
        }

        if (!currentSettings.clients) {
            currentSettings.clients = [];
        }

        // ۲. ساخت مشخصات کلاینت جدید
        const uuid = crypto.randomUUID();
        const subId = crypto.randomBytes(8).toString("hex");
        const shortId = crypto.randomBytes(4).toString("hex");
        const email = `${remark.replace(/[^a-zA-Z0-9]/g, "")}_${shortId}`;

        const clientPayload = {
            id: uuid,
            email: email,
            enable: true,
            expiryTime: typeof expiryTimeMs === "number" ? expiryTimeMs : 0,
            totalGB: typeof trafficLimitBytes === "number" ? trafficLimitBytes : 0,
            flow: "xtls-rprx-vision",
            limitIp: 0,
            tgId: 0,
            subId: subId
        };

        // ۳. تزریق به کلاینت‌های موجود
        currentSettings.clients.push(clientPayload);

        // ۴. بازسازی کامل پکیج بروزرسانی اینباند
        const updatePayload = {
            enable: inboundObj.enable,
            remark: inboundObj.remark,
            port: inboundObj.port,
            protocol: inboundObj.protocol,
            settings: JSON.stringify(currentSettings),
            streamSettings: typeof inboundObj.streamSettings === "object"
                ? JSON.stringify(inboundObj.streamSettings)
                : inboundObj.streamSettings,
            sniffing: typeof inboundObj.sniffing === "object"
                ? JSON.stringify(inboundObj.sniffing)
                : inboundObj.sniffing,
            expiryTime: inboundObj.expiryTime,
            total: inboundObj.total
        };

        console.log(`[XuiService] Executing network-safe mutation on inbound #${inboundId} for: ${email}...`);

        // ۵. ارسال درخواست با مأمور احراز هویت زنده
        const updateRes = await instance.post(`/panel/api/inbounds/update/${inboundId}`, updatePayload);

        if (!updateRes.data?.success) {
            throw new Error(`Inbound mutation failed: ${JSON.stringify(updateRes.data)}`);
        }

        console.log("✅ [XuiService] Inbound successfully updated over persistent connection.");

        const reality = await getRealitySettings();
        const configUrl = buildVlessRealityUrl(uuid, email, reality);
        const subUrl = `${env("XUI_SUB_URL")}/${subId}`;

        return { uuid, email, subId, configUrl, subUrl };
    }

    static async disableClient(uuid: string): Promise<void> {
        const instance = buildHttp();
        const inboundId = Number(env("XUI_INBOUND_ID"));

        try {
            const getRes = await instance.get(`/panel/api/inbounds/get/${inboundId}`);
            if (!getRes.data?.success || !getRes.data?.obj) return;

            const inboundObj = getRes.data.obj;
            let currentSettings = typeof inboundObj.settings === "string" ? JSON.parse(inboundObj.settings) : inboundObj.settings;

            if (currentSettings?.clients) {
                currentSettings.clients = currentSettings.clients.filter((c: any) => c.id !== uuid);

                const updatePayload = {
                    enable: inboundObj.enable,
                    remark: inboundObj.remark,
                    port: inboundObj.port,
                    protocol: inboundObj.protocol,
                    settings: JSON.stringify(currentSettings),
                    streamSettings: typeof inboundObj.streamSettings === "object" ? JSON.stringify(inboundObj.streamSettings) : inboundObj.streamSettings,
                    sniffing: typeof inboundObj.sniffing === "object" ? JSON.stringify(inboundObj.sniffing) : inboundObj.sniffing,
                    expiryTime: inboundObj.expiryTime,
                    total: inboundObj.total
                };

                await instance.post(`/panel/api/inbounds/update/${inboundId}`, updatePayload);
                console.log(`🗑️ [XuiService] Client ${uuid} removed.`);
            }
        } catch (err) {
            console.error("[XuiService] disableClient error:", err);
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
