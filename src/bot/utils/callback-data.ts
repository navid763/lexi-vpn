export function parseCallbackData(data: string) {
    const [action, id] = data.split(":");

    return {
        action,
        id: id ? Number(id) : null,
    };
}
