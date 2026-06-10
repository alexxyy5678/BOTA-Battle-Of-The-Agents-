import { createBantahBroTelegramBot } from "./server/telegramBot";
const bot = createBantahBroTelegramBot();
if (!bot) throw new Error("bot-not-created");
const realBot = (bot as any).bot;
const captured: any[] = [];
realBot.sendMessage = async (_chatId: number | string, text: string, options?: any) => {
  captured.push({ text, reply_markup: options?.reply_markup ?? null });
  return { message_id: captured.length } as any;
};
console.log("starting");
await bot.handleWebhookUpdate({
  update_id: 9001,
  message: {
    message_id: 101,
    date: Math.floor(Date.now() / 1000),
    chat: { id: 123456789, type: "private", first_name: "Tester" },
    from: { id: 123456789, is_bot: false, first_name: "Tester", username: "tester" },
    text: "/analyze solana So11111111111111111111111111111111111111112",
  },
} as any);
console.log("done");
console.log(JSON.stringify(captured.map((message) => ({
  text: message.text,
  buttons: message.reply_markup?.inline_keyboard?.flat?.().map((b: any) => b.text) ?? [],
})), null, 2));
