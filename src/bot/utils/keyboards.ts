import { Product } from "../../models/index.ts";

export const mainMenuKeyboards = () => {

    return {
        inline_keyboard: [
            [
                {
                    text: "📦 سرویس های موجود",
                    callback_data: "PLANS",
                }
            ],
            [
                {
                    text: "🔐 سرویس‌های من",
                    callback_data: "MY_SERVICES",
                },
            ]
        ]
    }
};


export const productsKeyboard = (products: Product[]) => {
    const productButtons = products.map(product => [
        {
            text: `${product.name} ${product.traffic_limit / 1000} گیگ ✅  ${product.price / 10} تومان`,
            callback_data: `BUY:${product.id}`,
        }
    ]);

    return {
        inline_keyboard: [
            ...productButtons,

            [
                {
                    text: "⬅️ بازگشت به سرویسها",
                    callback_data: "PLANS",
                },
                {
                    text: "🏠 خانه",
                    callback_data: "HOME",
                }
            ]
        ]
    }
}