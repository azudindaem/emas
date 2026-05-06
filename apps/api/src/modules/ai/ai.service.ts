import { BadGatewayException, GatewayTimeoutException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TransformTextDto } from './dto/ai.dto'

interface OllamaGenerateResponse {
  response?: string
}

@Injectable()
export class AiService {
  constructor(private readonly config: ConfigService) {}

  async transformText(tenantId: string, dto: TransformTextDto) {
    const baseUrl = this.config.get<string>('LOCAL_AI_BASE_URL', 'http://127.0.0.1:11434')
    const model = this.config.get<string>('LOCAL_AI_MODEL', 'qwen2.5:7b')
    const timeoutMs = this.config.get<number>('LOCAL_AI_TIMEOUT_MS', 12000)

    const prompt = this.buildPrompt(dto)
    const startedAt = Date.now()

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new BadGatewayException(`Local AI request failed (${response.status}): ${errText}`)
      }

      const data = (await response.json()) as OllamaGenerateResponse
      const transformedText = (data.response ?? '').trim()

      return {
        tenantId,
        task: dto.task,
        model,
        inputChars: dto.text.length,
        outputChars: transformedText.length,
        elapsedMs: Date.now() - startedAt,
        result: transformedText,
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new GatewayTimeoutException('Local AI timeout')
      }
      if (error instanceof BadGatewayException) throw error
      throw new BadGatewayException(`Local AI unavailable: ${(error as Error).message}`)
    }
  }

  private buildPrompt(dto: TransformTextDto): string {
    const lengthRule = dto.length ? `Target length: ${dto.length}.` : ''
    const toneRule = dto.tone ? `Tone: ${dto.tone}.` : ''
    const languageRule = dto.language ? `Language: ${dto.language}.` : ''

    const taskInstruction: Record<TransformTextDto['task'], string> = {
      rewrite: 'Rewrite the text to be clearer while preserving meaning.',
      summarize: 'Summarize the text into key points only.',
      translate: 'Translate the text accurately.',
      improve: 'Improve grammar, clarity, and readability.',
    }

    return [
      'You are a concise writing assistant for an e-commerce SaaS product in Malaysia.',
      'Return only the final transformed text without explanation or markdown.',
      taskInstruction[dto.task],
      lengthRule,
      toneRule,
      languageRule,
      '',
      'INPUT:',
      dto.text,
    ].filter(Boolean).join('\n')
  }
}
