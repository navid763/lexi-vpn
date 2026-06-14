/**
 * XuiService — 3x-ui panel integration (VLESS + Reality, inbound #4).
 *
 * Required env vars:
 *   XUI_PANEL_URL      — panel base URL including path prefix
 *                        e.g. http://jetlag8.ir:2079/navoolex
 *   XUI_API_TOKEN      — Bearer token from panel Settings → API
 *   XUI_INBOUND_ID     — inbound to add clients to (4)
 *   XUI_SUB_URL        — public subscription base URL
 *                        e.g. http://jetlag8.ir:2079/navoolex/sub
 *   XUI_SERVER_ADDRESS — the VPN server address users connect to
 *                        (may differ from panel host if panel is proxied)
 *                        e.g. jetlag8.ir
 */

import axios, { type AxiosInstance } from "axios";
import crypto from "crypto";

// ─── Result type ──────────────────────────────────────────────────────────────

export interface XuiClientResult {
    uuid: string;
    email: string;
    /** Direct import URI — paste into any VLESS client */
    configUrl: string;
    /** Subscription link — client fetches & auto-updates config from this */
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
        headers: { Authorization: `Bearer ${env("XUI_API_TOKEN")}` },
    });
}

// ─── Fetch & cache Reality settings from inbound ──────────────────────────────

async function getRealitySettings(): Promise<RealitySettings> {
    if (cachedReality) return cachedReality;

    const http = buildHttp();
    const inboundId = Number(env("XUI_INBOUND_ID"));

    const res = await http.get(`/panel/api/inbounds/get/${inboundId}`);

    if (!res.data?.success) {
        throw new Error(
            `3x-ui getInbound failed: ${JSON.stringify(res.data)}`
        );
    }

    const obj = res.data.obj;
    let stream: any = {};

    try {
        stream = JSON.parse(obj.streamSettings ?? "{}");
    } catch {
        throw new Error("3x-ui: could not parse streamSettings JSON");
    }

    const reality = stream.realitySettings;
    if (!reality) {
        throw new Error(
            "3x-ui: inbound is not configured with Reality security — check XUI_INBOUND_ID"
        );
    }

    cachedReality = {
        port: obj.port,
        publicKey: reality.publicKey ?? "",
        fingerprint: reality.fingerprint ?? "chrome",
        sni: reality.serverNames?.[0] ?? "",
        shortId: reality.shortIds?.[0] ?? "",
        spiderX: reality.spiderX ?? "/",
    };

    console.log("[XuiService] Reality settings cached from inbound:", cachedReality);
    return cachedReality;
}

// ─── VLESS+Reality URI builder ────────────────────────────────────────────────

function buildVlessRealityUrl(
    uuid: string,
    email: string,
    reality: RealitySettings
): string {
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
     * Adds a new VLESS+Reality client and returns both the direct config URI
     * and the subscription link.
     *
     * @param trafficLimitBytes  Quota in bytes (e.g. 10 * 1024³ for 10 GB)
     * @param expiryTimeMs       Unix timestamp in milliseconds
     * @param remark             Label shown in the panel UI
     */
    static async addClient(
        trafficLimitBytes: number,
        expiryTimeMs: number,
        remark: string
    ): Promise<XuiClientResult> {
        const http = buildHttp();
        const inboundId = Number(env("XUI_INBOUND_ID"));

        const uuid = crypto.randomUUID();
        const subId = crypto.randomBytes(8).toString("hex");
        const email = `${remark}-${uuid.slice(0, 8)}`;

        // Add client to panel
        const res = await http.post("/panel/api/inbounds/addClient", {
            id: inboundId,
            settings: JSON.stringify({
                clients: [{
                    id: uuid,
                    email,
                    enable: true,
                    expiryTime: expiryTimeMs,
                    totalGB: trafficLimitBytes,
                    flow: "xtls-rprx-vision",
                    limitIp: 0,
                    tgId: "",
                    subId,
                    comment: remark,
                    reset: 0,
                }],
            }),
        });

        if (!res.data?.success) {
            throw new Error(
                `3x-ui addClient failed: ${JSON.stringify(res.data)}`
            );
        }

        // Build both URLs
        const reality = await getRealitySettings();
        const configUrl = buildVlessRealityUrl(uuid, email, reality);
        const subUrl = `${env("XUI_SUB_URL")}/${subId}`;

        return { uuid, email, configUrl, subUrl };
    }

    /**
     * Removes a client from the panel by UUID.
     * Non-fatal — logs on failure so the bot flow isn't blocked.
     */
    static async disableClient(uuid: string): Promise<void> {
        const http = buildHttp();
        const inboundId = Number(env("XUI_INBOUND_ID"));

        try {
            const res = await http.post(
                `/panel/api/inbounds/${inboundId}/delClient/${uuid}`,
                {}
            );
            if (!res.data?.success) {
                console.error("[XuiService] disableClient panel error:", res.data);
            }
        } catch (err) {
            console.error("[XuiService] disableClient network error:", err);
        }
    }

    /**
     * Call once at startup to pre-warm the Reality settings cache.
     * Prevents the first real user from paying the fetch cost.
     */
    static async warmup(): Promise<void> {
        try {
            await getRealitySettings();
        } catch (err) {
            console.error("[XuiService] warmup failed — will retry on first use:", err);
        }
    }
}