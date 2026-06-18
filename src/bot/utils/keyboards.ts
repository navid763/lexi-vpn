import type { Product } from "@prisma/client";

export const mainMenuKeyboards = () => {
    return {
        inline_keyboard: [
            [{ text: "📦 سرویس های موجود", callback_data: "PLANS" }],
            [{ text: "🔐 سرویس‌های من", callback_data: "MY_SERVICES" }],
            [{ text: "👤 پروفایل من", callback_data: "MY_PROFILE" }],
            [{ text: "💰 اعتبار من", callback_data: "MY_BALANCE" }],
            [{ text: "💝 اعتبار هدیه", callback_data: "GET_MY_REFERRAL" }],
            [{ text: "📞 پشتیبانی", callback_data: "SUPPORT" }],
        ],
    };
};

export const productsKeyboard = (products: Product[]) => {
    const productButtons = products.map((product) => [
        {
            text: ` ${product.trafficLimit / 1000} گیگ — ${product.durationDays} روزه ⚜️ ${(product.price / 10).toLocaleString()} تومان`,
            callback_data: `BUY:${product.id}`,
        },
    ]);

    return {
        inline_keyboard: [
            ...productButtons,
            [{ text: "🏠 خانه", callback_data: "HOME" }],
        ],
    };
};

export const payOptionsKeyboards = (productId: number) => {
    return {
        inline_keyboard: [
            [{ text: "کارت به کارت 💳", callback_data: `CARD_PAY:${productId}` }],
            [
                {
                    text: "پرداخت با اعتبار کیف پول 💰",
                    callback_data: `WALLET_PAY:${productId}`,
                },
            ],
        ],
    };
};
