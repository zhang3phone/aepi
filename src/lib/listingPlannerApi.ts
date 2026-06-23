import type { ApiProfile } from '../types'
import { DEFAULT_CHAT_MODEL, DEFAULT_RESPONSES_MODEL, isOfficialDeepSeekPlannerProfile } from './apiProfiles'
import { formatAmazonAPlusReferenceMaterial, formatAmazonListingReferenceMaterial } from './amazonKnowledge'
import { buildApiUrl, readClientDevProxyConfig, shouldUseApiProxy } from './devProxy'
import { getApiErrorMessage } from './imageApiShared'
import type { AmazonPromptDraft } from './amazonPrompt'
import {
  getAPlusContentTypeLabel,
  getAPlusModuleGenerationSize,
  getAPlusModuleSpecs,
  getAPlusModuleUploadSize,
  getAmazonListingSlots,
  normalizeAPlusModuleSpecs,
  normalizeListingImageCount,
  type APlusContentType,
  type AmazonAPlusModuleSpec,
  type AmazonAPlusPlan,
  type AmazonImagePlan,
  type AmazonPlannerMode,
  type ListingParseResult,
} from './listingPlanner'
import { isEventStreamResponse, looksLikeServerSentEvents, readJsonServerSentEvents, readJsonServerSentEventText } from './serverSentEvents'
import type { SizeTier } from './size'

interface PlannerApiPayload {
  product?: {
    title?: string
    category?: string
    brand?: string
    color?: string
    material?: string
    audience?: string
    scene?: string
    packageIncludes?: string
  }
  sellingPoints?: string[]
  seriesStyleGuide?: string
  imagePlans?: Array<Partial<AmazonImagePlan>>
  aPlusPlans?: Array<Partial<AmazonAPlusPlan>>
}

const DEEPSEEK_TEXT_ONLY_PLANNER_GUARD = 'Because DeepSeek cannot receive or understand reference images in this request, do not infer or describe product facts that are not explicitly present in the listing text or user-provided product facts. Do not invent colors, shapes, structures, accessories, logos, bundle quantity, package contents, materials, printed text, ports, buttons, or product variants. If a visual detail is unknown, keep the prompt neutral and refer to the exact product described by the provided facts. This guard does not prohibit high-probability target-audience and usage-scene inference from listing text and category signals.'
const AUDIENCE_SCENE_INFERENCE_GUIDE = [
  'Target audience and usage scene inference rule:',
  '- product.audience and product.scene are high-priority planning fields and must not be empty.',
  '- If the pasted listing explicitly states target users or use scenes, use those facts.',
  '- If the pasted listing does not state them, infer the highest-probability target audience and primary usage scenes from product title, category, materials, features, package contents, and problem/benefit signals.',
  '- Keep the inference conservative and commercially useful: choose likely users and likely environments, not rare edge cases.',
  '- Do not write "unknown", "not specified", "N/A", or ask the user to manually supplement these two fields.',
  '- product.scene should describe the most useful usage environments and composition directions for later image planning.',
].join('\n')
const PRODUCT_REFERENCE_FACTS_ONLY_PLANNER_GUIDE = [
  'Product reference image rule:',
  '- Use product reference images only to identify product facts: real appearance, color, shape, structure, included accessories, materials, package contents, and feature evidence.',
  '- Do not use product reference images to choose the final visual style, color palette, background mood, typography style, decorative accents, or overall aesthetic unless the listing text explicitly requests it.',
  '- imagePlans[].prompt and aPlusPlans[].prompt must avoid fixed non-product aesthetics such as coastal resort, warm cream background, botanical accents, luxury editorial, cyberpunk, or magazine fashion unless those are explicit product, brand, or listing requirements.',
  '- seriesStyleGuide should preserve cross-image product consistency, factual visual continuity, copy hierarchy, and product appearance only; it must not lock the final palette, typography, background, lighting mood, or decorative system because the user-selected preset style controls those during image generation.',
].join('\n')
const SIZE_CHART_ONLY_PLANNER_GUIDE = [
  'Size chart / dimension image rule:',
  '- If any listing slot is a size chart, dimension chart, size options image, measurement infographic, spec diagram, or dimensional comparison image, make that slot a dedicated size-only image.',
  '- A size-only image must show only product dimensions, size variants, measurement arrows, labels, scale/spec information, and the product silhouette or product thumbnails needed to explain dimensions.',
  '- Do not mix usage scenarios, applicable scenes, lifestyle icons, benefit claims, selling points, product functions, feature callouts, emotional copy, or marketing slogans into a size chart slot.',
  '- If usage scenarios, benefits, or product functions are useful, assign them to a separate non-size slot instead of combining them with the size chart.',
].join('\n')
const SIZE_CHART_ONLY_PROMPT_GUARD = [
  'Size chart only:',
  '- This image must be a dedicated dimensions/specifications image only.',
  '- Show product dimensions, size variants, measurement arrows, measurement labels, and size/spec layout only.',
  '- Do not include usage scenarios, applicable scenes, lifestyle icons, benefit claims, selling points, product functions, feature callouts, or marketing slogans.',
  '- Do not add bottom scene strips, use-case icon rows, lifestyle panels, or functional benefit blocks.',
].join('\n')
const SIZE_CHART_NEGATIVE_GUARD = 'usage scenarios, lifestyle icons, scene strip, benefit claims, selling points, product functions, feature callouts, marketing slogans, emotional copy, use case panels'
const SIZE_CHART_PLAN_RE = /(size\s*(options?|chart|guide)|dimension|dimensions|measurement|measurements|spec\s*(diagram|chart)|尺寸|尺码|规格|测量|量尺|大小|尺寸图|尺码图|规格图)/i
const ICON_BENEFIT_DEDUP_PLANNER_GUIDE = [
  'Small benefit icon rule:',
  '- If an image uses small icons, benefit icons, feature icons, badge rows, pictograms, or a bottom icon strip, each benefit must appear only once in that image.',
  '- Do not repeat the same selling point across multiple icons, and do not repeat a benefit already stated in the headline, main panels, callouts, or large visual sections.',
  '- If the main panels already cover benefits such as Easy to Clean, Machine Washable, Quick-Dry, Waterproof, Non-Slip, or Protects Floors, do not repeat those same benefits again in a bottom icon row.',
  '- Prefer fewer unique icons over a crowded row of repeated benefits. If there are not enough unique benefits, remove the icon row or use neutral supporting visual details instead.',
].join('\n')
const ICON_BENEFIT_DEDUP_PROMPT_GUARD = [
  'Small benefit icon rule:',
  '- Each small icon or badge in this image must communicate a different benefit exactly once.',
  '- Do not repeat the same selling point in multiple icons.',
  '- Do not duplicate benefits already shown in the headline, main image panels, large callouts, or main copy blocks.',
  '- If a benefit is already presented elsewhere in the same image, omit it from the icon row. Use fewer icons rather than repeating.',
].join('\n')
const ICON_BENEFIT_NEGATIVE_GUARD = 'duplicate benefit icons, repeated selling point labels, repeated icon labels, duplicated feature icons, redundant bottom icon row'
const ICON_ROW_PLAN_RE = /(small\s*(benefit\s*)?icons?|benefit\s*icons?|feature\s*icons?|badge\s*row|icon\s*(row|strip|set|badges?)|bottom\s*icons?|pictograms?|小图标|图标栏|图标行|功能图标|卖点图标|底部图标|图标卖点)/i
const TEXT_FREE_SCENE_PLANNER_GUIDE = [
  'Text-free product scene image rule:',
  '- In the listing image plan, include 1-2 product scene / lifestyle images with no on-image text at all.',
  '- These text-free scene images should show the product naturally in a realistic use environment, with the product clearly visible and supported by real context.',
  '- Text-free scene images must not contain headlines, captions, callouts, labels, arrows, measurement marks, icon rows, badges, benefit copy, feature copy, or marketing slogans.',
  '- Put functional explanations, benefit claims, icons, and text callouts into separate information images instead of mixing them into these text-free scene images.',
].join('\n')
const TEXT_FREE_SCENE_PROMPT_GUARD = [
  'Text-free product scene image:',
  '- This scene image must contain no visible text anywhere.',
  '- Do not include headlines, captions, callouts, labels, arrows, measurement marks, icons, badges, feature labels, benefit copy, or marketing slogans.',
  '- Show only the product in a realistic use scene with clean composition, natural lighting, and accurate product appearance.',
].join('\n')
const TEXT_FREE_SCENE_NEGATIVE_GUARD = 'text, letters, numbers, captions, headlines, labels, feature labels, callouts, arrows, icons, badges, benefit copy, feature copy, marketing slogans, infographic elements'
const TEXT_FREE_SCENE_PLAN_RE = /(text[-\s]*free|no\s*(visible\s*)?text|without\s*text|product\s*scene|lifestyle|in[-\s]*use|usage\s*scene|realistic\s*use|场景图|产品场景|使用场景|生活场景|真实场景|无文字场景|无字场景)/i

export interface PlannerApiResult {
  mode: AmazonPlannerMode
  parsed: ListingParseResult
  seriesStyleGuide: string
  plans: AmazonImagePlan[]
  aPlusPlans: AmazonAPlusPlan[]
  aPlusType?: APlusContentType
}

const PRODUCT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    category: { type: 'string' },
    brand: { type: 'string' },
    color: { type: 'string' },
    material: { type: 'string' },
    audience: { type: 'string' },
    scene: { type: 'string' },
    packageIncludes: { type: 'string' },
  },
  required: ['title', 'category', 'brand', 'color', 'material', 'audience', 'scene', 'packageIncludes'],
} as const

const SELLING_POINTS_SCHEMA = {
  type: 'array',
  minItems: 1,
  maxItems: 5,
  items: { type: 'string' },
} as const

const CHINESE_LABEL_SCHEMA = {
  type: 'string',
  description: 'Concise Simplified Chinese label for UI display.',
} as const

const ENGLISH_ON_IMAGE_COPY_SCHEMA = {
  type: 'string',
  description: 'Short natural US-English on-image copy only, or an empty string. The image model should render it consistently when the final prompt includes it; never include Chinese characters.',
} as const

const ENGLISH_IMAGE_PROMPT_SCHEMA = {
  type: 'string',
  description: 'Professional English image-generation prompt only. Never include Chinese characters.',
} as const

const PLAN_MARKDOWN_SCHEMA = {
  type: 'string',
  description: 'Detailed Simplified Chinese planning write-up for this slot, similar to a ChatGPT agent response. Markdown is allowed.',
} as const

const NEGATIVE_PROMPT_SCHEMA = {
  type: 'string',
  description: 'English negative prompt for the image model. Never include Chinese characters.',
} as const

function createListingPlannerSchema(listingImageCount: number) {
  const slots = getAmazonListingSlots(listingImageCount)
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      product: PRODUCT_SCHEMA,
      sellingPoints: SELLING_POINTS_SCHEMA,
      seriesStyleGuide: {
        type: 'string',
        description: 'LLM-authored English visual style guide to keep the whole image set coherent.',
      },
      imagePlans: {
        type: 'array',
        minItems: slots.length,
        maxItems: slots.length,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            slot: { type: 'string', enum: slots },
            label: CHINESE_LABEL_SCHEMA,
            planMarkdown: PLAN_MARKDOWN_SCHEMA,
            prompt: ENGLISH_IMAGE_PROMPT_SCHEMA,
            negativePrompt: NEGATIVE_PROMPT_SCHEMA,
          },
          required: ['slot', 'label', 'planMarkdown', 'prompt', 'negativePrompt'],
        },
      },
    },
    required: ['product', 'sellingPoints', 'seriesStyleGuide', 'imagePlans'],
  } as const
}

function createAPlusPlannerSchema(aPlusType: APlusContentType, aPlusModuleSpecs?: AmazonAPlusModuleSpec[]) {
  const specs = normalizeAPlusModuleSpecs(aPlusType, aPlusModuleSpecs)
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      product: PRODUCT_SCHEMA,
      sellingPoints: SELLING_POINTS_SCHEMA,
      seriesStyleGuide: {
        type: 'string',
        description: 'LLM-authored English visual style guide to keep the whole A+ module set coherent.',
      },
      aPlusPlans: {
        type: 'array',
        minItems: specs.length,
        maxItems: specs.length,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            slot: { type: 'string', enum: specs.map((spec) => spec.slot) },
            label: CHINESE_LABEL_SCHEMA,
            moduleType: { type: 'string', enum: Array.from(new Set(specs.map((spec) => spec.moduleType))) },
            planMarkdown: PLAN_MARKDOWN_SCHEMA,
            textTitle: { type: 'string' },
            textBody: { type: 'string' },
            prompt: ENGLISH_IMAGE_PROMPT_SCHEMA,
            negativePrompt: NEGATIVE_PROMPT_SCHEMA,
          },
          required: ['slot', 'label', 'moduleType', 'planMarkdown', 'textTitle', 'textBody', 'prompt', 'negativePrompt'],
        },
      },
    },
    required: ['product', 'sellingPoints', 'seriesStyleGuide', 'aPlusPlans'],
  } as const
}

function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const record = payload as Record<string, unknown>
  if (typeof record.output_text === 'string') return record.output_text

  const choices = Array.isArray(record.choices) ? record.choices : []
  const chatChunks: string[] = []
  for (const choice of choices) {
    if (!choice || typeof choice !== 'object') continue
    const choiceRecord = choice as Record<string, unknown>
    const message = choiceRecord.message
    if (message && typeof message === 'object') {
      const messageRecord = message as Record<string, unknown>
      const content = messageRecord.content
      if (typeof content === 'string') chatChunks.push(content)
      else if (Array.isArray(content)) {
        for (const part of content) {
          if (!part || typeof part !== 'object') continue
          const partRecord = part as Record<string, unknown>
          if (typeof partRecord.text === 'string') chatChunks.push(partRecord.text)
        }
      }
    }
    const delta = choiceRecord.delta
    if (delta && typeof delta === 'object') {
      const content = (delta as Record<string, unknown>).content
      if (typeof content === 'string') chatChunks.push(content)
    }
  }
  if (chatChunks.length) return chatChunks.join('\n').trim()

  const output = Array.isArray(record.output) ? record.output : []
  const chunks: string[] = []
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const itemRecord = item as Record<string, unknown>
    const content = Array.isArray(itemRecord.content) ? itemRecord.content : []
    for (const part of content) {
      if (!part || typeof part !== 'object') continue
      const partRecord = part as Record<string, unknown>
      if (typeof partRecord.text === 'string') chunks.push(partRecord.text)
    }
  }
  return chunks.join('\n').trim()
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getStringValue(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key]
  return typeof value === 'string' && value ? value : undefined
}

function parsePlannerPayload(text: string): PlannerApiPayload {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]
  return JSON.parse(fenced ?? trimmed) as PlannerApiPayload
}

function getPlannerPayloadFromEvent(event: Record<string, unknown>): unknown {
  if (isRecordValue(event.response)) return event.response
  if (isRecordValue(event.item)) return { output: [event.item] }
  return null
}

function getPlannerTextFromEvent(event: Record<string, unknown>): string {
  const directText = extractResponseText(event)
  if (directText) return directText

  const payloadText = extractResponseText(getPlannerPayloadFromEvent(event))
  if (payloadText) return payloadText

  const text = getStringValue(event, 'text')
  if (text) return text

  const part = event.part
  if (isRecordValue(part)) {
    const partText = getStringValue(part, 'text')
    if (partText) return partText
  }

  return ''
}

async function readPlannerTextFromSseResponse(response: Response): Promise<string> {
  let completedText = ''
  let outputItemText = ''
  let doneText = ''
  let deltaText = ''

  await readJsonServerSentEvents(response, (event) => {
    const type = getStringValue(event, 'type')
    if (type === 'response.output_text.delta') {
      deltaText += getStringValue(event, 'delta') ?? ''
      return
    }

    const text = getPlannerTextFromEvent(event)
    if (!text) return

    if (type === 'response.completed') completedText = text
    else if (type === 'response.output_item.done') outputItemText = text
    else if (type === 'response.output_text.done' || type === 'response.content_part.done') doneText = text
    else if (!type) deltaText += text
  })

  return completedText.trim() || outputItemText.trim() || doneText.trim() || deltaText.trim()
}

async function readPlannerTextFromSseText(rawText: string): Promise<string> {
  let completedText = ''
  let outputItemText = ''
  let doneText = ''
  let deltaText = ''

  await readJsonServerSentEventText(rawText, (event) => {
    const type = getStringValue(event, 'type')
    if (type === 'response.output_text.delta') {
      deltaText += getStringValue(event, 'delta') ?? ''
      return
    }

    const text = getPlannerTextFromEvent(event)
    if (!text) return

    if (type === 'response.completed') completedText = text
    else if (type === 'response.output_item.done') outputItemText = text
    else if (type === 'response.output_text.done' || type === 'response.content_part.done') doneText = text
    else if (!type) deltaText += text
  })

  return completedText.trim() || outputItemText.trim() || doneText.trim() || deltaText.trim()
}

function isJsonContentType(contentType: string): boolean {
  return contentType.includes('application/json') || contentType.includes('+json')
}

function truncateForError(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= 1200) return trimmed
  return `${trimmed.slice(0, 1200)}...`
}

async function readPlannerResponseText(response: Response): Promise<string> {
  if (isEventStreamResponse(response)) {
    const text = await readPlannerTextFromSseResponse(response)
    if (!text) throw new Error('AI生成提示词流式接口未返回文本内容')
    return text
  }

  const rawText = await response.text()
  if (!rawText.trim()) throw new Error('AI生成提示词接口返回空内容')

  if (looksLikeServerSentEvents(rawText)) {
    const text = await readPlannerTextFromSseText(rawText)
    if (!text) throw new Error('AI生成提示词流式接口未返回文本内容')
    return text
  }

  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''
  if (!isJsonContentType(contentType) && !/^[{\[]/.test(rawText.trimStart())) {
    throw new Error(`AI生成提示词接口返回了非 JSON 内容：${truncateForError(rawText)}`)
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawText)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`AI生成提示词接口返回了无法解析的 JSON：${message}\n\n${truncateForError(rawText)}`)
  }

  const text = extractResponseText(payload)
  if (!text) throw new Error('AI生成提示词接口未返回文本内容')
  return text
}

function normalizePlan(plan: Partial<AmazonImagePlan>, index: number, slots: string[]): AmazonImagePlan {
  const normalized = {
    slot: plan.slot || slots[index] || `PT${String(index).padStart(2, '0')}`,
    label: plan.label || '图片方案',
    ...(plan.kind ? { kind: plan.kind } : {}),
    planMarkdown: plan.planMarkdown || '',
    prompt: plan.prompt || '',
    negativePrompt: plan.negativePrompt || '',
  }
  return enforcePlannerPlanRules(normalized)
}

function isSizeChartPlan(plan: Pick<AmazonImagePlan, 'label' | 'planMarkdown' | 'prompt'>) {
  return SIZE_CHART_PLAN_RE.test([plan.label, plan.planMarkdown, plan.prompt].join('\n'))
}

function appendSectionOnce(value: string, section: string) {
  const trimmed = value.trim()
  if (!trimmed) return section
  if (trimmed.includes(section)) return trimmed
  return `${trimmed}\n\n${section}`
}

function appendNegativeOnce(value: string, addition: string) {
  const trimmed = value.trim()
  if (!trimmed) return addition
  if (trimmed.toLowerCase().includes(addition.toLowerCase())) return trimmed
  return `${trimmed}, ${addition}`
}

function enforceSizeChartOnlyPlan<T extends AmazonImagePlan | AmazonAPlusPlan>(plan: T): T {
  if (!isSizeChartPlan(plan)) return plan
  return {
    ...plan,
    planMarkdown: appendSectionOnce(
      plan.planMarkdown,
      '尺寸图规则：本图只做尺寸/规格/尺码展示，不混入适用场景、卖点、产品功能、生活方式图标或营销文案；这些内容需要拆到其他图片位。',
    ),
    prompt: appendSectionOnce(plan.prompt, SIZE_CHART_ONLY_PROMPT_GUARD),
    negativePrompt: appendNegativeOnce(plan.negativePrompt, SIZE_CHART_NEGATIVE_GUARD),
  } as T
}

function isIconBenefitPlan(plan: Pick<AmazonImagePlan, 'label' | 'planMarkdown' | 'prompt'>) {
  return ICON_ROW_PLAN_RE.test([plan.label, plan.planMarkdown, plan.prompt].join('\n'))
}

function enforceIconBenefitDedupPlan<T extends AmazonImagePlan | AmazonAPlusPlan>(plan: T): T {
  if (!isIconBenefitPlan(plan)) return plan
  return {
    ...plan,
    planMarkdown: appendSectionOnce(
      plan.planMarkdown,
      '小图标规则：同一张图里的小图标卖点必须去重；已在标题、主画面、主面板或大标注中出现过的卖点，不要再放进底部图标栏重复展示。宁可减少图标数量，也不要重复同一个卖点。',
    ),
    prompt: appendSectionOnce(plan.prompt, ICON_BENEFIT_DEDUP_PROMPT_GUARD),
    negativePrompt: appendNegativeOnce(plan.negativePrompt, ICON_BENEFIT_NEGATIVE_GUARD),
  } as T
}

function isTextFreeScenePlan(plan: Pick<AmazonImagePlan, 'label' | 'planMarkdown' | 'prompt'>) {
  return TEXT_FREE_SCENE_PLAN_RE.test([plan.label, plan.planMarkdown, plan.prompt].join('\n'))
}

function enforceTextFreeScenePlan<T extends AmazonImagePlan | AmazonAPlusPlan>(plan: T): T {
  if (!isTextFreeScenePlan(plan)) return plan
  return {
    ...plan,
    planMarkdown: appendSectionOnce(
      plan.planMarkdown,
      '无文字场景图规则：本图只展示产品在真实使用环境中的自然画面，不放任何标题、字幕、图标、箭头、标注、卖点文案或功能说明；这些信息需要拆到其他信息图里。',
    ),
    prompt: appendSectionOnce(plan.prompt, TEXT_FREE_SCENE_PROMPT_GUARD),
    negativePrompt: appendNegativeOnce(plan.negativePrompt, TEXT_FREE_SCENE_NEGATIVE_GUARD),
  } as T
}

function enforcePlannerPlanRules<T extends AmazonImagePlan | AmazonAPlusPlan>(plan: T): T {
  return enforceTextFreeScenePlan(enforceIconBenefitDedupPlan(enforceSizeChartOnlyPlan(plan)))
}

function inferHighProbabilityAudienceAndScene(
  product: PlannerApiPayload['product'],
  sellingPoints: string[],
): Pick<AmazonPromptDraft, 'audience' | 'scene'> {
  const text = [
    product?.title,
    product?.category,
    product?.material,
    product?.packageIncludes,
    ...sellingPoints,
  ].filter(Boolean).join(' ').toLowerCase()

  if (/mug|tumbler|bottle|cup|drink|coffee|water|hydration|insulated|straw|kitchen|drinkware/.test(text)) {
    return {
      audience: 'commuters, office workers, drivers, students, fitness and travel users',
      scene: 'car cup holder, office desk, gym bag, outdoor travel, daily hydration scene',
    }
  }
  if (/baby|infant|toddler|kid|children|child|nursery|school/.test(text)) {
    return {
      audience: 'parents, caregivers, families with children',
      scene: 'home nursery, family room, school or daily childcare use scene',
    }
  }
  if (/pet|dog|cat|puppy|kitten|leash|collar|groom|litter/.test(text)) {
    return {
      audience: 'pet owners, dog and cat owners, pet-care households',
      scene: 'home pet-care area, living room, outdoor walk, grooming or feeding scene',
    }
  }
  if (/garden|patio|outdoor|camp|hiking|travel|beach|yard/.test(text)) {
    return {
      audience: 'outdoor users, homeowners, campers, travelers, patio and garden users',
      scene: 'outdoor patio, garden, campsite, travel packing, backyard use scene',
    }
  }
  if (/office|desk|ergonomic|computer|laptop|keyboard|monitor|stationery/.test(text)) {
    return {
      audience: 'office workers, remote workers, students, desk setup users',
      scene: 'office desk, home workstation, study room, productivity setup scene',
    }
  }
  if (/fitness|gym|yoga|workout|sport|running|cycling|athletic/.test(text)) {
    return {
      audience: 'fitness users, athletes, gym-goers, active lifestyle users',
      scene: 'gym, workout area, sports bag, outdoor training, active lifestyle scene',
    }
  }
  if (/beauty|skin|makeup|cosmetic|hair|salon|spa|nail/.test(text)) {
    return {
      audience: 'beauty users, personal-care buyers, salon and home grooming users',
      scene: 'bathroom vanity, dressing table, salon counter, personal-care routine scene',
    }
  }
  if (/tool|hardware|repair|garage|workshop|mechanic|drill|screw/.test(text)) {
    return {
      audience: 'DIY users, homeowners, repair workers, workshop and garage users',
      scene: 'garage workbench, home repair, workshop, tool organization scene',
    }
  }
  if (/home|decor|bathroom|bedroom|living room|kitchen|storage|organizer/.test(text)) {
    return {
      audience: 'home users, renters, homeowners, household organizers',
      scene: 'home room setting, kitchen, bathroom, bedroom, storage or organization scene',
    }
  }

  return {
    audience: 'daily-use shoppers, home and office users, gift buyers',
    scene: 'clean home or work setting, product-in-use scene matching the category, simple lifestyle composition',
  }
}

function normalizeParsedListing(payload: PlannerApiPayload, baseDraft: AmazonPromptDraft): ListingParseResult {
  const product = payload.product ?? {}
  const sellingPoints = Array.isArray(payload.sellingPoints)
    ? payload.sellingPoints.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).slice(0, 5)
    : []
  const inferredAudienceAndScene = inferHighProbabilityAudienceAndScene(product, sellingPoints)
  const audience = product.audience?.trim() || baseDraft.audience.trim() || inferredAudienceAndScene.audience
  const scene = product.scene?.trim() || baseDraft.scene.trim() || inferredAudienceAndScene.scene

  if (!product.title?.trim()) throw new Error('AI生成提示词结果缺少商品标题')

  return {
    title: product.title.trim(),
    bullets: sellingPoints,
    inferred: {
      productTitle: product.title.trim(),
      category: product.category?.trim() ?? '',
      ...(product.brand?.trim() ? { brand: product.brand.trim() } : {}),
      color: product.color?.trim() ?? '',
      material: product.material?.trim() ?? '',
      audience,
      scene,
      packageIncludes: product.packageIncludes?.trim() ?? '',
      sellingPoints: sellingPoints.join('\n'),
    },
  }
}

function normalizeSeriesStyleGuide(payload: PlannerApiPayload): string {
  return typeof payload.seriesStyleGuide === 'string' ? payload.seriesStyleGuide.trim() : ''
}

function normalizeListingPlannerApiPayload(payload: PlannerApiPayload, baseDraft: AmazonPromptDraft, listingImageCount: number): PlannerApiResult {
  const parsed = normalizeParsedListing(payload, baseDraft)
  const seriesStyleGuide = normalizeSeriesStyleGuide(payload)
  const slots = getAmazonListingSlots(listingImageCount)
  const plans = Array.isArray(payload.imagePlans)
    ? slots
      .map((slot, index) => {
        const rawPlan = payload.imagePlans?.find((plan) => plan?.slot === slot) ?? payload.imagePlans?.[index]
        return rawPlan ? normalizePlan(rawPlan, index, slots) : null
      })
      .filter((plan): plan is AmazonImagePlan => plan != null && Boolean(plan.prompt.trim()) && Boolean(plan.planMarkdown.trim()))
    : []

  if (plans.length !== slots.length) throw new Error(`AI生成提示词结果不是 ${slots.length} 张图`)

  return {
    mode: 'listing',
    parsed,
    seriesStyleGuide,
    plans,
    aPlusPlans: [],
  }
}

function normalizeAPlusPlan(
  plan: Partial<AmazonAPlusPlan> | undefined,
  index: number,
  aPlusType: APlusContentType,
  tier: SizeTier,
  aPlusModuleSpecs?: AmazonAPlusModuleSpec[],
): AmazonAPlusPlan {
  const spec = normalizeAPlusModuleSpecs(aPlusType, aPlusModuleSpecs)[index]
  if (!spec) throw new Error('A+ 模块规格不存在')

  const normalized = {
    slot: plan?.slot || spec.slot,
    label: plan?.label || spec.label,
    moduleType: plan?.moduleType || spec.moduleType,
    uploadSize: getAPlusModuleUploadSize(spec),
    generationSize: getAPlusModuleGenerationSize(spec, tier),
    planMarkdown: plan?.planMarkdown || '',
    textTitle: plan?.textTitle || '',
    textBody: plan?.textBody || '',
    prompt: plan?.prompt || '',
    negativePrompt: plan?.negativePrompt || '',
  }
  return enforcePlannerPlanRules(normalized)
}

function normalizeAPlusPlannerApiPayload(
  payload: PlannerApiPayload,
  aPlusType: APlusContentType,
  tier: SizeTier,
  baseDraft: AmazonPromptDraft,
  aPlusModuleSpecs?: AmazonAPlusModuleSpec[],
): PlannerApiResult {
  const parsed = normalizeParsedListing(payload, baseDraft)
  const seriesStyleGuide = normalizeSeriesStyleGuide(payload)
  const specs = normalizeAPlusModuleSpecs(aPlusType, aPlusModuleSpecs)
  const rawPlans = Array.isArray(payload.aPlusPlans) ? payload.aPlusPlans : []
  if (rawPlans.length !== specs.length) throw new Error(`AI生成提示词 A+ 结果不是 ${specs.length} 个模块`)

  const aPlusPlans = specs.map((spec, index) => {
    const bySlot = rawPlans.find((plan) => plan?.slot === spec.slot)
    return normalizeAPlusPlan(bySlot ?? rawPlans[index], index, aPlusType, tier, specs)
  })

  const emptyPrompt = aPlusPlans.find((plan) => !plan.prompt.trim())
  if (emptyPrompt) throw new Error(`AI生成提示词 A+ 结果缺少 ${emptyPrompt.slot} 的提示词`)
  const emptyPlan = aPlusPlans.find((plan) => !plan.planMarkdown.trim())
  if (emptyPlan) throw new Error(`AI生成提示词 A+ 结果缺少 ${emptyPlan.slot} 的策划说明`)

  return {
    mode: 'aplus',
    parsed,
    seriesStyleGuide,
    plans: [],
    aPlusPlans,
    aPlusType,
  }
}

function buildListingPlannerInstructions(baseDraft: AmazonPromptDraft, listingImageCount: number) {
  const slots = getAmazonListingSlots(listingImageCount)
  return [
    'You are an Amazon image-planning agent. The user provides listing copy and optional product reference images.',
    `Create a complete visual plan for exactly ${slots.length} Amazon listing image slots: ${slots.join(', ')}.`,
    'The application only fixes the slot count and order. You must decide the strategy, composition, copy approach, visual treatment, prompt content, and negative prompt content.',
    'Use the Amazon reference material below to improve compliance judgment. It is not a fixed slot-by-slot framework, and it must not replace the product facts from the listing and reference images.',
    formatAmazonListingReferenceMaterial(),
    PRODUCT_REFERENCE_FACTS_ONLY_PLANNER_GUIDE,
    SIZE_CHART_ONLY_PLANNER_GUIDE,
    ICON_BENEFIT_DEDUP_PLANNER_GUIDE,
    TEXT_FREE_SCENE_PLANNER_GUIDE,
    AUDIENCE_SCENE_INFERENCE_GUIDE,
    'For each slot, write planMarkdown in Simplified Chinese as a detailed agent-style plan similar to a ChatGPT web response, then write a professional English image prompt and English negative prompt.',
    'Each image prompt should fully plan the finished Amazon image: composition, product evidence, on-image US-English copy when useful, callouts or information areas when useful, visual hierarchy, and rendering style.',
    'For secondary information images, prefer complete information design with clear hierarchy and useful product evidence; lifestyle or beauty slots should still have purposeful composition and visible product support.',
    'Return one seriesStyleGuide string in English for cross-image product consistency and factual visual continuity. Keep it style-neutral and do not use it to choose the final color palette, typography, background mood, lighting mood, or decorative style.',
    'Do not create, request, or describe separate style reference board images. The application uses built-in preset style reference boards.',
    'Field language rules: label and planMarkdown must be Simplified Chinese; seriesStyleGuide, prompt, and negativePrompt must be English.',
    'Do not generate images. Only return JSON matching the schema.',
    baseDraft.category ? `Known category: ${baseDraft.category}` : '',
  ].filter(Boolean).join('\n')
}

function getAPlusPlannerTypeName(aPlusType: APlusContentType) {
  switch (aPlusType) {
    case 'premium':
      return 'Premium A+ Content'
    case 'mobile':
      return 'Mobile A+ Content 600x450 module set'
    case 'standard-large':
      return 'Regular A+ Content large-image template'
    default:
      return 'Standard A+ Content'
  }
}

function buildAPlusPlannerInstructions(
  baseDraft: AmazonPromptDraft,
  aPlusType: APlusContentType,
  aPlusModuleSpecs?: AmazonAPlusModuleSpec[],
) {
  const specs = normalizeAPlusModuleSpecs(aPlusType, aPlusModuleSpecs)
  const typeLabel = getAPlusPlannerTypeName(aPlusType)
  const mobileGuidance = aPlusType === 'mobile'
    ? 'For Mobile A+ modules, design every 600x450 image for compact mobile screens: one clear message per module, large product evidence, short mobile-readable US-English copy, and no dense multi-column layouts.'
    : ''
  return [
    'You are an Amazon A+ Content image-planning agent. The user provides listing copy, optional brand notes, and optional product reference images.',
    `Create a ${typeLabel} image module plan. Do not generate images. Only return JSON matching the schema.`,
    `Return exactly ${specs.length} modules in this order: ${specs.map((spec) => `${spec.slot} ${spec.label} ${getAPlusModuleUploadSize(spec)}px`).join('; ')}.`,
    'The application only fixes the module order, module type, upload size, and generation size. You must decide the strategy, composition, copy approach, visual treatment, prompt content, and negative prompt content.',
    'Use the Amazon A+ reference material below to improve compliance judgment. It is not a fixed module creative framework, and it must not replace the product facts from the listing and reference images.',
    formatAmazonAPlusReferenceMaterial(),
    PRODUCT_REFERENCE_FACTS_ONLY_PLANNER_GUIDE,
    SIZE_CHART_ONLY_PLANNER_GUIDE,
    ICON_BENEFIT_DEDUP_PLANNER_GUIDE,
    AUDIENCE_SCENE_INFERENCE_GUIDE,
    'Text-free product scene rule for A+ modules: when an A+ module is primarily a product scene or lifestyle image, keep the image itself free of headlines, captions, callouts, labels, arrows, icons, badges, benefit copy, feature copy, and marketing slogans unless the fixed module specifically requires on-image text. External textTitle/textBody may still be used outside the image when appropriate.',
    'For each module, write planMarkdown in Simplified Chinese as a detailed agent-style plan similar to a ChatGPT web response, then write a professional English image prompt and English negative prompt.',
    'Each module prompt should fully plan the finished Amazon image: composition, product evidence, on-image US-English copy when useful, callouts or information areas when useful, visual hierarchy, and rendering style.',
    'For A+ information modules, prefer complete information design with clear hierarchy and useful product evidence; lifestyle or brand modules should still have purposeful composition and visible product support.',
    mobileGuidance,
    baseDraft.brand
      ? `Known brand/model: ${baseDraft.brand}. For header-banner and hero-banner modules, naturally include this real brand/model as a small brand line, headline prefix, or subline when it improves the composition. For brand-story modules, use this brand/model to frame the brand tone or promise only when supported by the provided listing or brand notes.`
      : 'If no real brand/model is provided, do not invent a brand name, logo, trademark, brand history, brand promise, authorization claim, website, contact detail, or external link.',
    'Use brand names as text only unless the user provides a real logo reference image. Do not invent logo artwork, standalone trademark/copyright symbols, brand history, authorization claims, websites, contact details, or external links.',
    'Return one seriesStyleGuide string in English for cross-module product consistency and factual visual continuity. Keep it style-neutral and do not use it to choose the final color palette, typography, background mood, lighting mood, or decorative style.',
    'Do not create, request, or describe separate style reference board images. The application uses built-in preset style reference boards.',
    'For modules that need external A+ text outside the image, write textTitle and textBody in natural US English. Otherwise return empty strings.',
    'Field language rules: label and planMarkdown must be Simplified Chinese; textTitle/textBody must be English or empty; seriesStyleGuide, prompt, and negativePrompt must be English.',
    baseDraft.category ? `Known category: ${baseDraft.category}` : '',
  ].filter(Boolean).join('\n')
}

function buildPlannerInstructions(
  baseDraft: AmazonPromptDraft,
  mode: AmazonPlannerMode,
  aPlusType: APlusContentType,
  options: { textOnlyReferenceGuard?: boolean; listingImageCount?: number; aPlusModuleSpecs?: AmazonAPlusModuleSpec[] } = {},
) {
  const listingImageCount = normalizeListingImageCount(options.listingImageCount)
  return [
    mode === 'aplus'
    ? buildAPlusPlannerInstructions(baseDraft, aPlusType, options.aPlusModuleSpecs)
    : buildListingPlannerInstructions(baseDraft, listingImageCount),
    options.textOnlyReferenceGuard ? DEEPSEEK_TEXT_ONLY_PLANNER_GUARD : '',
  ].filter(Boolean).join('\n')
}

function formatDraftFact(label: string, value: string) {
  const trimmed = value.trim()
  return trimmed ? `- ${label}: ${trimmed}` : ''
}

function buildUserProductFactsText(baseDraft: AmazonPromptDraft) {
  const facts = [
    formatDraftFact('Product title', baseDraft.productTitle),
    formatDraftFact('Category', baseDraft.category),
    formatDraftFact('Brand or model', baseDraft.brand),
    formatDraftFact('Color', baseDraft.color),
    formatDraftFact('Material / finish', baseDraft.material),
    formatDraftFact('Target customer', baseDraft.audience),
    formatDraftFact('Package includes', baseDraft.packageIncludes),
    formatDraftFact('Key selling points', baseDraft.sellingPoints),
    formatDraftFact('Do not show / avoid', baseDraft.forbidden),
  ].filter(Boolean)

  return facts.length
    ? ['User-provided product facts. Treat these as authoritative and do not contradict them:', ...facts].join('\n')
    : ''
}

function buildPlannerInputText(
  listingText: string,
  mode: AmazonPlannerMode,
  aPlusType: APlusContentType,
  options: {
    includeReferenceImageInstruction?: boolean
    userProductFacts?: string
    listingImageCount?: number
    aPlusModuleSpecs?: AmazonAPlusModuleSpec[]
  } = {},
) {
  const referenceImageInstruction = options.includeReferenceImageInstruction
    ? 'If reference images are attached, use them to understand the actual product appearance and included items.'
    : ''
  const userProductFacts = options.userProductFacts?.trim()
  if (mode === 'aplus') {
    const specs = normalizeAPlusModuleSpecs(aPlusType, options.aPlusModuleSpecs)
    return [
      `Parse this Amazon listing copy and produce the ${getAPlusContentTypeLabel(aPlusType)} module plan.`,
      'Use the title and bullet points from the pasted text. If a field is uncertain, infer conservatively from the listing.',
      'Target audience and usage scene are required. If they are missing, infer the highest-probability audience and scene instead of leaving them blank.',
      `Use these A+ modules exactly: ${specs.map((spec) => spec.slot).join(', ')}.`,
      referenceImageInstruction,
      userProductFacts,
      '',
      listingText,
    ].filter((item) => item !== '').join('\n')
  }
  const slots = getAmazonListingSlots(options.listingImageCount)

  return [
    `Parse this Amazon listing copy and produce the ${slots.length}-image visual plan.`,
    'Use the title and bullet points from the pasted text. If a field is uncertain, infer conservatively from the listing.',
    'Target audience and usage scene are required. If they are missing, infer the highest-probability audience and scene instead of leaving them blank.',
    referenceImageInstruction,
    userProductFacts,
    '',
    listingText,
  ].filter((item) => item !== '').join('\n')
}

function buildChatPlannerUserContent(text: string, referenceImageDataUrls: string[]) {
  if (!referenceImageDataUrls.length) return text
  return [
    { type: 'text', text },
    ...referenceImageDataUrls.map((url) => ({
      type: 'image_url',
      image_url: { url },
    })),
  ]
}

function buildResponsesPlannerInput(text: string, referenceImageDataUrls: string[]) {
  return [
    {
      role: 'user',
      content: [
        {
          type: 'input_text',
          text,
        },
        ...referenceImageDataUrls.map((url) => ({
          type: 'input_image',
          image_url: url,
        })),
      ],
    },
  ]
}

function buildChatPlannerSchemaGuide(
  mode: AmazonPlannerMode,
  aPlusType: APlusContentType,
  options: { listingImageCount?: number; aPlusModuleSpecs?: AmazonAPlusModuleSpec[] } = {},
) {
  const productFields = 'product { title, category, color, material, audience, scene, packageIncludes }'
  const styleFields = 'seriesStyleGuide string'
  if (mode === 'aplus') {
    const specs = normalizeAPlusModuleSpecs(aPlusType, options.aPlusModuleSpecs)
    return [
      `Return JSON with: ${productFields}, sellingPoints string[], ${styleFields}, aPlusPlans array.`,
      `aPlusPlans must contain exactly ${specs.length} items in this order: ${specs.map((spec) => spec.slot).join(', ')}.`,
      'Each aPlusPlans item must include: slot, label, moduleType, planMarkdown, textTitle, textBody, prompt, negativePrompt.',
    ].join('\n')
  }
  const slots = getAmazonListingSlots(options.listingImageCount)

  return [
    `Return JSON with: ${productFields}, sellingPoints string[], ${styleFields}, imagePlans array.`,
    `imagePlans must contain exactly ${slots.length} items in this order: ${slots.join(', ')}.`,
    'Each imagePlans item must include: slot, label, planMarkdown, prompt, negativePrompt.',
  ].join('\n')
}

function buildChatPlannerSystemPrompt(
  baseDraft: AmazonPromptDraft,
  mode: AmazonPlannerMode,
  aPlusType: APlusContentType,
  options: { textOnlyReferenceGuard?: boolean; listingImageCount?: number; aPlusModuleSpecs?: AmazonAPlusModuleSpec[] } = {},
) {
  return [
    buildPlannerInstructions(baseDraft, mode, aPlusType, options),
    'Return a valid JSON object only. Do not output Markdown fences, comments, or any text outside the JSON object.',
    buildChatPlannerSchemaGuide(mode, aPlusType, options),
  ].join('\n\n')
}

export async function callAmazonPlannerApi(options: {
  listingText: string
  baseDraft: AmazonPromptDraft
  profile: ApiProfile
  referenceImageDataUrls?: string[]
  model?: string
  mode?: AmazonPlannerMode
  aPlusType?: APlusContentType
  listingImageCount?: number
  aPlusModuleSpecs?: AmazonAPlusModuleSpec[]
  aPlusGenerationTier?: SizeTier
  signal?: AbortSignal
}): Promise<PlannerApiResult> {
  const model = options.model?.trim() || options.profile.model.trim() || (options.profile.apiMode === 'chat' ? DEFAULT_CHAT_MODEL : DEFAULT_RESPONSES_MODEL)
  const mode = options.mode ?? 'listing'
  const aPlusType = options.aPlusType ?? 'standard-large'
  const listingImageCount = normalizeListingImageCount(options.listingImageCount)
  const aPlusModuleSpecs = normalizeAPlusModuleSpecs(aPlusType, options.aPlusModuleSpecs)
  const aPlusGenerationTier = options.aPlusGenerationTier ?? '2K'
  const schema = mode === 'aplus' ? createAPlusPlannerSchema(aPlusType, aPlusModuleSpecs) : createListingPlannerSchema(listingImageCount)
  const proxyConfig = readClientDevProxyConfig()
  const useApiProxy = shouldUseApiProxy(options.profile.apiProxy, proxyConfig)
  const useChatCompletions = options.profile.apiMode === 'chat'
  const isDeepSeekPlannerProfile = isOfficialDeepSeekPlannerProfile(options.profile)
  const inputText = buildPlannerInputText(options.listingText, mode, aPlusType, {
    includeReferenceImageInstruction: !isDeepSeekPlannerProfile,
    userProductFacts: isDeepSeekPlannerProfile ? buildUserProductFactsText(options.baseDraft) : '',
    listingImageCount,
    aPlusModuleSpecs,
  })
  const referenceImageDataUrls = isDeepSeekPlannerProfile
    ? []
    : options.referenceImageDataUrls ?? []
  const response = await fetch(
    useChatCompletions
      ? buildApiUrl(options.profile.baseUrl, 'chat/completions', proxyConfig, useApiProxy, { prefixV1: false })
      : buildApiUrl(options.profile.baseUrl, 'responses', proxyConfig, useApiProxy),
    {
    method: 'POST',
    signal: options.signal,
    headers: {
      Authorization: `Bearer ${options.profile.apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify(useChatCompletions
      ? {
          model,
          messages: [
            {
              role: 'system',
              content: buildChatPlannerSystemPrompt(options.baseDraft, mode, aPlusType, {
                textOnlyReferenceGuard: isDeepSeekPlannerProfile,
                listingImageCount,
                aPlusModuleSpecs,
              }),
            },
            {
              role: 'user',
              content: buildChatPlannerUserContent(inputText, referenceImageDataUrls),
            },
          ],
          response_format: { type: 'json_object' },
          stream: false,
        }
      : {
          model,
          instructions: buildPlannerInstructions(options.baseDraft, mode, aPlusType, {
            textOnlyReferenceGuard: isDeepSeekPlannerProfile,
            listingImageCount,
            aPlusModuleSpecs,
          }),
          input: buildResponsesPlannerInput(inputText, referenceImageDataUrls),
          text: {
            format: {
              type: 'json_schema',
              name: mode === 'aplus' ? 'amazon_aplus_image_plan' : 'amazon_listing_image_plan',
              strict: true,
              schema,
            },
          },
          stream: false,
        },
    ),
    },
  )

  if (!response.ok) {
    const message = await getApiErrorMessage(response)
    throw new Error(`HTTP ${response.status}: ${message}`)
  }
  const text = await readPlannerResponseText(response)
  const payload = parsePlannerPayload(text)
  return mode === 'aplus'
    ? normalizeAPlusPlannerApiPayload(payload, aPlusType, aPlusGenerationTier, options.baseDraft, aPlusModuleSpecs)
    : normalizeListingPlannerApiPayload(payload, options.baseDraft, listingImageCount)
}
