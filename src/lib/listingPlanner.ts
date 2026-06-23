import type { AmazonImageKind, AmazonPromptDraft } from './amazonPrompt'
import type { AmazonStyleDensityMode } from '../types'
import { calculateImageSize, type SizeTier } from './size'

export type AmazonPlannerMode = 'listing' | 'aplus'
export type { AmazonStyleDensityMode } from '../types'
export type APlusContentType = 'standard' | 'standard-large' | 'premium' | 'mobile'
export type APlusModuleKind =
  | 'header-banner'
  | 'single-image'
  | 'highlight-tile'
  | 'hero-banner'
  | 'feature-image'
  | 'brand-story'
  | 'logo'
  | 'comparison-thumbnail'

export interface ListingParseResult {
  title: string
  bullets: string[]
  inferred: Partial<AmazonPromptDraft>
}

export interface AmazonImagePlan {
  slot: string
  label: string
  kind?: AmazonImageKind
  planMarkdown: string
  prompt: string
  negativePrompt: string
}

export interface AmazonAPlusModuleSpec {
  contentType: APlusContentType | 'optional'
  slot: string
  label: string
  displayLabel: string
  moduleType: APlusModuleKind
  uploadWidth: number
  uploadHeight: number
  objective: string
}

export interface AmazonAPlusPlan {
  slot: string
  label: string
  moduleType: APlusModuleKind
  uploadSize: string
  generationSize: string
  planMarkdown: string
  textTitle: string
  textBody: string
  prompt: string
  negativePrompt: string
}

export const DEFAULT_LISTING_IMAGE_COUNT = 7
export const MIN_LISTING_IMAGE_COUNT = 7
export const MAX_LISTING_IMAGE_COUNT = 12
export const LISTING_IMAGE_COUNT_OPTIONS = Array.from(
  { length: MAX_LISTING_IMAGE_COUNT - MIN_LISTING_IMAGE_COUNT + 1 },
  (_, index) => MIN_LISTING_IMAGE_COUNT + index,
)
export const MIN_A_PLUS_MODULE_COUNT = 1
export const MAX_A_PLUS_MODULE_COUNT = 12
export type ClothingModelType = 'black' | 'white'
export type ClothingModelAngle = 'front' | 'angle-45'
export type ClothingModelArmPose = 'arms-down' | 'arms-crossed'
export const CLOTHING_MODEL_SLOT = 'MODEL'
export const CLOTHING_MODEL_TARGET_SIZE = '1000x1000'

const CLOTHING_MODEL_TYPE_LABELS: Record<ClothingModelType, { label: string; prompt: string }> = {
  black: {
    label: '黑人模特',
    prompt: 'an adult Black fashion model',
  },
  white: {
    label: '白人模特',
    prompt: 'an adult white/Caucasian fashion model',
  },
}

const CLOTHING_MODEL_ANGLE_LABELS: Record<ClothingModelAngle, { label: string; prompt: string }> = {
  front: {
    label: '正面',
    prompt: 'front-facing camera angle',
  },
  'angle-45': {
    label: '45度侧面',
    prompt: '45-degree three-quarter side angle',
  },
}

const CLOTHING_MODEL_ARM_POSE_LABELS: Record<ClothingModelArmPose, { label: string; prompt: string }> = {
  'arms-down': {
    label: '双手自然下垂',
    prompt: 'arms relaxed naturally down at both sides, similar to clean catalog reference poses',
  },
  'arms-crossed': {
    label: '双手环抱',
    prompt: 'arms crossed naturally in front of the body without hiding the garment shape',
  },
}

export const STANDARD_A_PLUS_MODULE_SPECS: AmazonAPlusModuleSpec[] = [
  {
    contentType: 'standard',
    slot: 'A+S01',
    label: 'Header Banner',
    displayLabel: '顶部横幅',
    moduleType: 'header-banner',
    uploadWidth: 970,
    uploadHeight: 300,
    objective: '用横幅建立品牌质感和核心产品利益点。',
  },
  ...Array.from({ length: 3 }, (_, index) => ({
    contentType: 'standard' as const,
    slot: `A+S0${index + 2}`,
    label: `Single Image ${index + 1}`,
    displayLabel: `大图模块 ${index + 1}`,
    moduleType: 'single-image' as const,
    uploadWidth: 970,
    uploadHeight: 600,
    objective: '用单图模块讲清一个关键卖点或使用场景。',
  })),
  ...Array.from({ length: 4 }, (_, index) => ({
    contentType: 'standard' as const,
    slot: `A+S0${index + 5}`,
    label: `Highlight Tile ${index + 1}`,
    displayLabel: `卖点方块 ${index + 1}`,
    moduleType: 'highlight-tile' as const,
    uploadWidth: 220,
    uploadHeight: 220,
    objective: '用方形图块快速呈现一个产品亮点。',
  })),
]

export const STANDARD_LARGE_A_PLUS_MODULE_SPECS: AmazonAPlusModuleSpec[] = [
  {
    contentType: 'standard-large',
    slot: 'A+L01',
    label: 'Header Banner',
    displayLabel: '顶部横幅',
    moduleType: 'header-banner',
    uploadWidth: 970,
    uploadHeight: 300,
    objective: '用横幅建立品牌质感和核心产品利益点。',
  },
  ...Array.from({ length: 4 }, (_, index) => ({
    contentType: 'standard-large' as const,
    slot: `A+L0${index + 2}`,
    label: `Single Image ${index + 1}`,
    displayLabel: `大图模块 ${index + 1}`,
    moduleType: 'single-image' as const,
    uploadWidth: 970,
    uploadHeight: 600,
    objective: '用整张大图讲清一个关键卖点、使用场景或细节证据。',
  })),
]

export const PREMIUM_A_PLUS_MODULE_SPECS: AmazonAPlusModuleSpec[] = [
  {
    contentType: 'premium',
    slot: 'A+P01',
    label: 'Hero Banner',
    displayLabel: '高级首屏横幅',
    moduleType: 'hero-banner',
    uploadWidth: 1464,
    uploadHeight: 600,
    objective: '用高级横幅建立首屏视觉冲击和品牌氛围。',
  },
  ...Array.from({ length: 3 }, (_, index) => ({
    contentType: 'premium' as const,
    slot: `A+P0${index + 2}`,
    label: `Feature Image ${index + 1}`,
    displayLabel: `高级大图模块 ${index + 1}`,
    moduleType: 'feature-image' as const,
    uploadWidth: 970,
    uploadHeight: 600,
    objective: '用大图模块展示核心功能、材质或真实场景。',
  })),
  ...Array.from({ length: 2 }, (_, index) => ({
    contentType: 'premium' as const,
    slot: `A+P0${index + 5}`,
    label: `Brand Story ${index + 1}`,
    displayLabel: `品牌故事 ${index + 1}`,
    moduleType: 'brand-story' as const,
    uploadWidth: 463,
    uploadHeight: 625,
    objective: '用竖版品牌故事模块强化信任和使用想象。',
  })),
]

export const MOBILE_A_PLUS_MODULE_SPECS: AmazonAPlusModuleSpec[] = [
  {
    contentType: 'mobile',
    slot: 'A+M01',
    label: 'Mobile Hero',
    displayLabel: '手机首屏',
    moduleType: 'hero-banner',
    uploadWidth: 600,
    uploadHeight: 450,
    objective: '用移动端首屏图建立产品核心卖点和清晰视觉吸引力。',
  },
  ...Array.from({ length: 4 }, (_, index) => ({
    contentType: 'mobile' as const,
    slot: `A+M0${index + 2}`,
    label: `Mobile Feature ${index + 1}`,
    displayLabel: `手机卖点图 ${index + 1}`,
    moduleType: 'feature-image' as const,
    uploadWidth: 600,
    uploadHeight: 450,
    objective: '用移动端友好的 4:3 图片讲清一个关键卖点、细节证据或使用场景。',
  })),
]

export const OPTIONAL_A_PLUS_MODULE_SPECS: AmazonAPlusModuleSpec[] = [
  {
    contentType: 'optional',
    slot: 'A+LOGO',
    label: 'Logo Image',
    displayLabel: '品牌 Logo',
    moduleType: 'logo',
    uploadWidth: 600,
    uploadHeight: 180,
    objective: '用于已有品牌标志素材，不默认生成虚构 Logo。',
  },
  {
    contentType: 'optional',
    slot: 'A+CMP',
    label: 'Comparison Thumbnail',
    displayLabel: '对比缩略图',
    moduleType: 'comparison-thumbnail',
    uploadWidth: 150,
    uploadHeight: 300,
    objective: '用于同品牌 SKU 对比，不默认生成不确定对比信息。',
  },
]

const CJK_ON_IMAGE_TEXT_RE = /[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/
const STYLE_REFERENCE_GUARD = [
  'Style reference rule:',
  '- The last input image is a hidden style reference selected by the user.',
  '- Use it only for color palette, lighting, contrast, material finish, typography feel, and overall visual polish.',
  '- The selected visual style text block is higher priority than any conflicting aesthetic language in the image task or series style guide.',
  '- Do not copy any placeholder words, fixed layout, color swatch positions, exact composition, product arrangement, product count, props, scene, or information density from the style reference board.',
  '- Follow the image task, layout density, and negative prompt sections for the actual content and arrangement.',
].join('\n')
const FINAL_OUTPUT_RESOLUTION_RE = /(?:^|\n)\s*Final output resolution:\s*\d+x\d+\.?\s*/gi

export function normalizeListingImageCount(value: unknown): number {
  const numberValue = typeof value === 'string' ? Number(value) : value
  if (typeof numberValue !== 'number' || !Number.isFinite(numberValue)) return DEFAULT_LISTING_IMAGE_COUNT
  const rounded = Math.round(numberValue)
  return Math.min(MAX_LISTING_IMAGE_COUNT, Math.max(MIN_LISTING_IMAGE_COUNT, rounded))
}

export function getAmazonListingSlots(count = DEFAULT_LISTING_IMAGE_COUNT): string[] {
  const normalizedCount = normalizeListingImageCount(count)
  return [
    'MAIN',
    ...Array.from({ length: normalizedCount - 1 }, (_, index) => `PT${String(index + 1).padStart(2, '0')}`),
  ]
}

export function formatAmazonListingSlotRange(count = DEFAULT_LISTING_IMAGE_COUNT): string {
  const slots = getAmazonListingSlots(count)
  return `${slots[0]} + ${slots[1]}-${slots[slots.length - 1]}`
}

function getAPlusSlotPrefix(type: APlusContentType): string {
  switch (type) {
    case 'premium':
      return 'A+P'
    case 'mobile':
      return 'A+M'
    case 'standard':
      return 'A+S'
    default:
      return 'A+L'
  }
}

function getAPlusModuleName(
  type: APlusContentType,
  moduleType: APlusModuleKind,
  occurrence: number,
): Pick<AmazonAPlusModuleSpec, 'label' | 'displayLabel'> {
  switch (moduleType) {
    case 'header-banner':
      return {
        label: occurrence > 1 ? `Header Banner ${occurrence}` : 'Header Banner',
        displayLabel: occurrence > 1 ? `顶部横幅 ${occurrence}` : '顶部横幅',
      }
    case 'single-image':
      return {
        label: `Single Image ${occurrence}`,
        displayLabel: `大图模块 ${occurrence}`,
      }
    case 'highlight-tile':
      return {
        label: `Highlight Tile ${occurrence}`,
        displayLabel: `卖点方块 ${occurrence}`,
      }
    case 'hero-banner':
      return {
        label: occurrence > 1 ? `Hero Banner ${occurrence}` : type === 'mobile' ? 'Mobile Hero' : 'Hero Banner',
        displayLabel: occurrence > 1 ? `${type === 'mobile' ? '手机首屏' : '高级首屏横幅'} ${occurrence}` : type === 'mobile' ? '手机首屏' : '高级首屏横幅',
      }
    case 'feature-image':
      return {
        label: type === 'mobile' ? `Mobile Feature ${occurrence}` : `Feature Image ${occurrence}`,
        displayLabel: type === 'mobile' ? `手机卖点图 ${occurrence}` : `高级大图模块 ${occurrence}`,
      }
    case 'brand-story':
      return {
        label: `Brand Story ${occurrence}`,
        displayLabel: `品牌故事 ${occurrence}`,
      }
    case 'logo':
      return {
        label: occurrence > 1 ? `Logo Image ${occurrence}` : 'Logo Image',
        displayLabel: occurrence > 1 ? `品牌 Logo ${occurrence}` : '品牌 Logo',
      }
    case 'comparison-thumbnail':
      return {
        label: occurrence > 1 ? `Comparison Thumbnail ${occurrence}` : 'Comparison Thumbnail',
        displayLabel: occurrence > 1 ? `对比缩略图 ${occurrence}` : '对比缩略图',
      }
    default:
      return {
        label: `A+ Module ${occurrence}`,
        displayLabel: `A+ 模块 ${occurrence}`,
      }
  }
}

function renumberAPlusModuleSpecs(type: APlusContentType, specs: AmazonAPlusModuleSpec[]): AmazonAPlusModuleSpec[] {
  const prefix = getAPlusSlotPrefix(type)
  const counts = new Map<APlusModuleKind, number>()
  return specs.map((spec, index) => {
    const occurrence = (counts.get(spec.moduleType) ?? 0) + 1
    counts.set(spec.moduleType, occurrence)
    const names = getAPlusModuleName(type, spec.moduleType, occurrence)
    return {
      ...spec,
      contentType: type,
      slot: `${prefix}${String(index + 1).padStart(2, '0')}`,
      label: names.label,
      displayLabel: names.displayLabel,
    }
  })
}

export function normalizeAPlusModuleSpecs(
  type: APlusContentType,
  specs?: Array<Partial<AmazonAPlusModuleSpec>> | null,
): AmazonAPlusModuleSpec[] {
  const fallback = getAPlusModuleSpecs(type)
  const source = Array.isArray(specs) && specs.length ? specs : fallback
  const normalized = source
    .slice(0, MAX_A_PLUS_MODULE_COUNT)
    .map((spec, index) => {
      const fallbackSpec = fallback[index] ?? fallback[fallback.length - 1]!
      return {
        contentType: type,
        slot: typeof spec.slot === 'string' && spec.slot ? spec.slot : fallbackSpec.slot,
        label: typeof spec.label === 'string' && spec.label ? spec.label : fallbackSpec.label,
        displayLabel: typeof spec.displayLabel === 'string' && spec.displayLabel ? spec.displayLabel : fallbackSpec.displayLabel,
        moduleType: spec.moduleType ?? fallbackSpec.moduleType,
        uploadWidth: Number.isFinite(spec.uploadWidth) ? Number(spec.uploadWidth) : fallbackSpec.uploadWidth,
        uploadHeight: Number.isFinite(spec.uploadHeight) ? Number(spec.uploadHeight) : fallbackSpec.uploadHeight,
        objective: typeof spec.objective === 'string' && spec.objective ? spec.objective : fallbackSpec.objective,
      }
    })
    .filter((spec) => spec.uploadWidth > 0 && spec.uploadHeight > 0)

  return renumberAPlusModuleSpecs(type, normalized.length ? normalized : fallback)
}

export function areAPlusModuleSpecsEquivalent(
  left: AmazonAPlusModuleSpec[],
  right: AmazonAPlusModuleSpec[],
): boolean {
  if (left.length !== right.length) return false
  return left.every((spec, index) => {
    const other = right[index]
    return Boolean(other) &&
      spec.slot === other.slot &&
      spec.label === other.label &&
      spec.displayLabel === other.displayLabel &&
      spec.moduleType === other.moduleType &&
      spec.uploadWidth === other.uploadWidth &&
      spec.uploadHeight === other.uploadHeight &&
      spec.objective === other.objective
  })
}

export function insertAPlusModuleSpecAfter(
  type: APlusContentType,
  specs: AmazonAPlusModuleSpec[],
  index: number,
): AmazonAPlusModuleSpec[] {
  const normalized = normalizeAPlusModuleSpecs(type, specs)
  if (normalized.length >= MAX_A_PLUS_MODULE_COUNT) return normalized
  const safeIndex = Math.min(Math.max(index, 0), normalized.length - 1)
  const source = normalized[safeIndex] ?? getAPlusModuleSpecs(type)[0]!
  const next = [
    ...normalized.slice(0, safeIndex + 1),
    { ...source },
    ...normalized.slice(safeIndex + 1),
  ]
  return renumberAPlusModuleSpecs(type, next)
}

export function removeAPlusModuleSpecAt(
  type: APlusContentType,
  specs: AmazonAPlusModuleSpec[],
  index: number,
): AmazonAPlusModuleSpec[] {
  const normalized = normalizeAPlusModuleSpecs(type, specs)
  if (normalized.length <= MIN_A_PLUS_MODULE_COUNT) return normalized
  return renumberAPlusModuleSpecs(type, normalized.filter((_, itemIndex) => itemIndex !== index))
}

const STYLE_DENSITY_GUIDES: Record<AmazonStyleDensityMode, string> = {
  rich: [
    'Layout density:',
    '- Use a polished, information-rich Amazon gallery layout when the selected image type benefits from explanation.',
    '- Build clear hierarchy with mobile-readable US-English copy, multiple well-spaced callouts, detail crops, comparison areas, measurement arrows, or use-case zones as appropriate.',
    '- Keep the composition premium and organized; information-rich should still be readable, balanced, and uncluttered.',
  ].join('\n'),
  minimal: [
    'Layout density:',
    '- Use a refined minimal Amazon layout with fewer callouts, generous balanced spacing, light icon or line treatment, and restrained US-English copy.',
    '- Keep the product and one or two strongest messages dominant, with clean hierarchy and no clutter.',
  ].join('\n'),
}

export function isAmazonListingMainSlot(slot?: string | null): boolean {
  return slot?.trim().toUpperCase() === 'MAIN'
}

export function isClothingModelSlot(slot?: string | null): boolean {
  return slot?.trim().toUpperCase() === CLOTHING_MODEL_SLOT
}

export function getClothingModelTypeLabel(type: ClothingModelType): string {
  return CLOTHING_MODEL_TYPE_LABELS[type].label
}

export function getClothingModelAngleLabel(angle: ClothingModelAngle): string {
  return CLOTHING_MODEL_ANGLE_LABELS[angle].label
}

export function getClothingModelArmPoseLabel(pose: ClothingModelArmPose): string {
  return CLOTHING_MODEL_ARM_POSE_LABELS[pose].label
}

function formatClothingModelFact(label: string, value: string) {
  const trimmed = value.trim()
  return trimmed ? `- ${label}: ${trimmed}` : ''
}

export function buildClothingModelPlan(
  draft: Pick<AmazonPromptDraft, 'productTitle' | 'category' | 'brand' | 'color' | 'material' | 'sellingPoints' | 'packageIncludes' | 'forbidden' | 'audience'>,
  options: {
    modelType: ClothingModelType
    angle: ClothingModelAngle
    armPose: ClothingModelArmPose
  },
): AmazonImagePlan {
  const modelType = CLOTHING_MODEL_TYPE_LABELS[options.modelType]
  const angle = CLOTHING_MODEL_ANGLE_LABELS[options.angle]
  const armPose = CLOTHING_MODEL_ARM_POSE_LABELS[options.armPose]
  const productFacts = [
    formatClothingModelFact('Product title', draft.productTitle),
    formatClothingModelFact('Category', draft.category || 'Apparel / Clothing'),
    formatClothingModelFact('Brand or model', draft.brand),
    formatClothingModelFact('Color', draft.color),
    formatClothingModelFact('Material / fabric', draft.material),
    formatClothingModelFact('Target customer', draft.audience),
    formatClothingModelFact('Key product facts / selling points', draft.sellingPoints),
    formatClothingModelFact('Package includes', draft.packageIncludes),
  ].filter(Boolean)

  const planMarkdown = [
    '## 白底模特主图',
    '',
    `- 输出规格：${CLOTHING_MODEL_TARGET_SIZE}，纯白背景 Amazon 服装主图。`,
    `- 模特设置：${modelType.label}，${angle.label}，${armPose.label}。`,
    '- 构图要求：参考上传的白底模特图只作为人物位置、裁切比例和站姿模板；人物居中，半身到大腿上方裁切，服装是画面主体。',
    '- 参考图限制：不要复制参考图人物身份、脸、发型、纹身、首饰、包袋、裤装配饰或其他无关元素。',
    '- 主图限制：不放卖点、图标、Logo、标题、尺寸信息、水印、边框、场景道具或营销文案。',
  ].join('\n')

  const prompt = [
    `Create a professional Amazon apparel main image at ${CLOTHING_MODEL_TARGET_SIZE}.`,
    '',
    'Product facts:',
    productFacts.length ? productFacts.join('\n') : '- Use the exact clothing product shown in the uploaded product reference images.',
    '',
    'Model and composition:',
    `- Use ${modelType.prompt}.`,
    `- Pose and view: ${angle.prompt}; ${armPose.prompt}.`,
    '- Pure white background RGB 255,255,255, clean studio catalog lighting, natural skin tone, realistic body proportions.',
    '- Use the uploaded model reference images only for framing and pose direction: centered body position, catalog crop, upper body to upper-thigh composition, and garment-dominant placement.',
    '- Do not copy any reference person identity, face, hairstyle, tattoos, jewelry, bag, shorts, pants, accessories, watermark, or non-product styling details.',
    '- The garment being sold must be accurate to the product reference images and listing facts; do not invent extra logos, patterns, seams, accessories, or variants.',
    '- Keep the face generic or unobtrusive; the clothing fit, fabric, color, neckline, sleeves, hem, and silhouette are the priority.',
    '',
    'Amazon main image rules:',
    '- No text, badges, icons, measurements, lifestyle scene, props, border, watermark, price, review claims, discount claims, Amazon marks, or decorative graphics.',
    '- Show only the model wearing the sold clothing item on a white background.',
    draft.forbidden.trim() ? `Additional user exclusions: ${draft.forbidden.trim()}` : '',
  ].filter(Boolean).join('\n')

  const negativePrompt = [
    'copied face, copied identity, copied hairstyle, copied tattoos, copied jewelry, copied bag, copied shorts, copied pants',
    'extra accessories, props, lifestyle background, non-white background, text, logo, watermark, badge, icon, measurement labels',
    'duplicate garments, wrong color, wrong fabric, distorted anatomy, extra limbs, cropped garment, hidden garment details',
    draft.forbidden.trim(),
  ].filter(Boolean).join(', ')

  return {
    slot: CLOTHING_MODEL_SLOT,
    label: '白底模特主图',
    kind: 'main',
    planMarkdown,
    prompt,
    negativePrompt,
  }
}

export function normalizeOnImageCopy(copy: string): string {
  return copy
    .replace(/\\n/g, '\n')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !CJK_ON_IMAGE_TEXT_RE.test(line))
    .join('\n')
}

function formatPromptBlock(options: {
  prompt: string
  negativePrompt?: string
  targetSize?: string
  seriesStyleGuide?: string | null
  styleReferenceAttached?: boolean
  styleDensityMode?: AmazonStyleDensityMode
  selectedVisualStyle?: {
    label: string
    description: string
    palette: string[]
  } | null
}) {
  const prompt = options.prompt.replace(FINAL_OUTPUT_RESOLUTION_RE, '\n').trim()
  const selectedVisualStyle = options.styleReferenceAttached ? options.selectedVisualStyle : null
  const selectedStyleBlock = selectedVisualStyle
    ? [
      'Selected visual style (highest priority):',
      `- Style reference: ${selectedVisualStyle.label}.`,
      `- Style direction: ${selectedVisualStyle.description}`,
      selectedVisualStyle.palette.length ? `- Palette anchors: ${selectedVisualStyle.palette.join(', ')}.` : '',
      '- This selected visual style is the highest-priority visual system for background, palette, typography, lighting, decorative accents, material finish, and information-panel styling.',
      '- If the image task prompt or Series style guide contains a conflicting aesthetic, background mood, color palette, typography direction, or decorative accent, override that conflict with this selected visual style while preserving product facts and required copy.',
    ].filter(Boolean).join('\n')
    : ''
  const seriesStyleGuideLabel = selectedStyleBlock
    ? 'Series style guide (lower priority than the selected visual style):'
    : 'Series style guide:'
  const sections = [
    prompt,
    selectedStyleBlock,
    options.seriesStyleGuide?.trim()
      ? `${seriesStyleGuideLabel}\n${options.seriesStyleGuide.trim()}`
      : '',
    options.styleReferenceAttached ? STYLE_DENSITY_GUIDES[options.styleDensityMode ?? 'rich'] : '',
    options.targetSize?.trim()
      ? `Final output resolution: ${options.targetSize.trim()}.`
      : '',
    options.negativePrompt?.trim()
      ? `Negative prompt:\n${options.negativePrompt.trim()}`
      : '',
    options.styleReferenceAttached ? STYLE_REFERENCE_GUARD : '',
  ].filter(Boolean)

  return sections.join('\n\n')
}

export function buildAmazonPlanPrompt(plan: Pick<AmazonImagePlan, 'prompt' | 'negativePrompt'> & {
  targetSize?: string
  seriesStyleGuide?: string | null
  styleReferenceAttached?: boolean
  styleDensityMode?: AmazonStyleDensityMode
  selectedVisualStyle?: {
    label: string
    description: string
    palette: string[]
  } | null
}): string {
  return formatPromptBlock(plan)
}

function formatAPlusUploadSize(spec: Pick<AmazonAPlusModuleSpec, 'uploadWidth' | 'uploadHeight'>): string {
  return `${spec.uploadWidth}x${spec.uploadHeight}`
}

function getSafeAPlusRatio(width: number, height: number): string {
  const ratio = width / height
  if (ratio > 3) return '3:1'
  if (ratio < 1 / 3) return '1:3'
  return `${width}:${height}`
}

function getAPlusGenerationSizeFromDimensions(width: number, height: number, tier: SizeTier): string {
  return calculateImageSize(tier, getSafeAPlusRatio(width, height)) ?? (tier === '4K' ? '2880x2880' : '2048x2048')
}

export function getAPlusModuleSpecs(type: APlusContentType): AmazonAPlusModuleSpec[] {
  switch (type) {
    case 'premium':
      return PREMIUM_A_PLUS_MODULE_SPECS
    case 'mobile':
      return MOBILE_A_PLUS_MODULE_SPECS
    case 'standard-large':
      return STANDARD_LARGE_A_PLUS_MODULE_SPECS
    default:
      return STANDARD_A_PLUS_MODULE_SPECS
  }
}

export function findAPlusModuleSpec(slot: string): AmazonAPlusModuleSpec | undefined {
  return [...STANDARD_A_PLUS_MODULE_SPECS, ...STANDARD_LARGE_A_PLUS_MODULE_SPECS, ...PREMIUM_A_PLUS_MODULE_SPECS, ...MOBILE_A_PLUS_MODULE_SPECS, ...OPTIONAL_A_PLUS_MODULE_SPECS]
    .find((spec) => spec.slot === slot)
}

export function getAPlusContentTypeLabel(type: APlusContentType): string {
  switch (type) {
    case 'premium':
      return '高级A+'
    case 'mobile':
      return '手机A+'
    case 'standard-large':
      return '普通A+'
    default:
      return '标准A+'
  }
}

export function getAPlusModuleDisplayName(module: Pick<AmazonAPlusPlan, 'slot' | 'moduleType'> | Pick<AmazonAPlusModuleSpec, 'slot' | 'moduleType'>): string {
  const directDisplayLabel = (module as { displayLabel?: string }).displayLabel
  if (directDisplayLabel) return directDisplayLabel
  const spec = findAPlusModuleSpec(module.slot)
  if (spec) return spec.displayLabel

  switch (module.moduleType) {
    case 'header-banner':
      return '顶部横幅'
    case 'single-image':
      return '大图模块'
    case 'highlight-tile':
      return '卖点方块'
    case 'hero-banner':
      return '高级首屏横幅'
    case 'feature-image':
      return '高级大图模块'
    case 'brand-story':
      return '品牌故事'
    case 'logo':
      return '品牌 Logo'
    case 'comparison-thumbnail':
      return '对比缩略图'
    default:
      return 'A+ 模块'
  }
}

export function getAPlusModuleEnglishName(module: Pick<AmazonAPlusPlan, 'slot' | 'label' | 'moduleType'> | Pick<AmazonAPlusModuleSpec, 'slot' | 'label' | 'moduleType'>): string {
  return module.label ?? findAPlusModuleSpec(module.slot)?.label ?? module.moduleType
}

export function isAPlusTextModule(module: Pick<AmazonAPlusPlan, 'moduleType'> | Pick<AmazonAPlusModuleSpec, 'moduleType'>): boolean {
  return module.moduleType === 'highlight-tile'
}

export function formatAPlusModuleText(plan: Pick<AmazonAPlusPlan, 'textTitle' | 'textBody'>): string {
  return [plan.textTitle.trim(), plan.textBody.trim()].filter(Boolean).join('\n\n')
}

export function getAPlusModuleUploadSize(spec: Pick<AmazonAPlusModuleSpec, 'uploadWidth' | 'uploadHeight'>): string {
  return formatAPlusUploadSize(spec)
}

export function getAPlusModuleGenerationSize(spec: Pick<AmazonAPlusModuleSpec, 'uploadWidth' | 'uploadHeight'>, tier: SizeTier): string {
  return getAPlusGenerationSizeFromDimensions(spec.uploadWidth, spec.uploadHeight, tier)
}

export function getAPlusPlanGenerationSize(plan: Pick<AmazonAPlusPlan, 'slot' | 'uploadSize'>, tier: SizeTier): string {
  const spec = findAPlusModuleSpec(plan.slot)
  if (spec) return getAPlusModuleGenerationSize(spec, tier)

  const match = plan.uploadSize.match(/^(\d+)x(\d+)$/)
  if (!match) return tier === '4K' ? '2880x2880' : '2048x2048'
  return getAPlusGenerationSizeFromDimensions(Number(match[1]), Number(match[2]), tier)
}

export function withAPlusGenerationSizes(plans: AmazonAPlusPlan[], tier: SizeTier): AmazonAPlusPlan[] {
  return plans.map((plan) => ({
    ...plan,
    generationSize: getAPlusPlanGenerationSize(plan, tier),
  }))
}

export function buildAmazonAPlusPlanPrompt(plan: Pick<AmazonAPlusPlan, 'prompt' | 'negativePrompt'> & {
  targetSize?: string
  seriesStyleGuide?: string | null
  styleReferenceAttached?: boolean
  styleDensityMode?: AmazonStyleDensityMode
  selectedVisualStyle?: {
    label: string
    description: string
    palette: string[]
  } | null
}): string {
  return formatPromptBlock(plan)
}
