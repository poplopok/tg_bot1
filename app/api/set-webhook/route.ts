import { Bot } from "grammy"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const bot = new Bot(process.env.BOT_TOKEN || "")
    const webhookUrl = `${process.env.VERCEL_URL || process.env.NEXTAUTH_URL}/api/webhook`

    await bot.api.setWebhook(webhookUrl)

    return NextResponse.json({
      success: true,
      message: "Webhook установлен",
      url: webhookUrl,
    })
  } catch (error) {
    console.error("Ошибка установки webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      },
      { status: 500 },
    )
  }
}
