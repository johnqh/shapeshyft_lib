/**
 * Pre-built endpoint templates for common use cases
 */

import type {
  EndpointCreateRequest,
  JsonSchema,
  ProjectCreateRequest,
} from '@sudobility/shapeshyft_types';

/**
 * Project template definition
 */
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  endpoints: EndpointTemplate[];
  /** If true, this template requires capabilities not yet implemented (V2 features) */
  requiresV2?: boolean;
}

/**
 * Endpoint template definition
 */
export interface EndpointTemplate {
  endpoint_name: string;
  display_name: string;
  input_schema: JsonSchema;
  output_schema: JsonSchema;
  instructions: string;
  context?: string;
}

/**
 * Text classifier template
 */
export const textClassifierTemplate: ProjectTemplate = {
  id: 'text-classifier',
  name: 'Text Classifier',
  description: 'Classify text into predefined categories',
  category: 'Classification',
  endpoints: [
    {
      endpoint_name: 'classify',
      display_name: 'Classify Text',
      input_schema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text to classify',
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of possible categories',
          },
        },
        required: ['text', 'categories'],
      },
      output_schema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'The classified category',
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Confidence score (0-1)',
          },
          reasoning: {
            type: 'string',
            description: 'Brief explanation of the classification',
          },
        },
        required: ['category', 'confidence'],
      },
      instructions:
        'Classify the input text into one of the provided categories. Return the most appropriate category along with a confidence score.',
    },
  ],
};

/**
 * Sentiment analyzer template
 */
export const sentimentAnalyzerTemplate: ProjectTemplate = {
  id: 'sentiment-analyzer',
  name: 'Sentiment Analyzer',
  description: 'Analyze sentiment and emotions in text',
  category: 'Analysis',
  endpoints: [
    {
      endpoint_name: 'analyze',
      display_name: 'Analyze Sentiment',
      input_schema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text to analyze',
          },
        },
        required: ['text'],
      },
      output_schema: {
        type: 'object',
        properties: {
          sentiment: {
            type: 'string',
            enum: ['positive', 'negative', 'neutral', 'mixed'],
            description: 'Overall sentiment',
          },
          score: {
            type: 'number',
            minimum: -1,
            maximum: 1,
            description: 'Sentiment score (-1 to 1)',
          },
          emotions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                emotion: { type: 'string' },
                intensity: { type: 'number', minimum: 0, maximum: 1 },
              },
              required: ['emotion', 'intensity'],
            },
            description: 'Detected emotions with intensity',
          },
          summary: {
            type: 'string',
            description: 'Brief summary of the sentiment analysis',
          },
        },
        required: ['sentiment', 'score'],
      },
      instructions:
        'Analyze the sentiment and emotions in the input text. Return the overall sentiment, a score, and detected emotions.',
    },
  ],
};

/**
 * Data extractor template
 */
export const dataExtractorTemplate: ProjectTemplate = {
  id: 'data-extractor',
  name: 'Data Extractor',
  description: 'Extract structured data from unstructured text',
  category: 'Extraction',
  endpoints: [
    {
      endpoint_name: 'extract-entities',
      display_name: 'Extract Entities',
      input_schema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text to extract entities from',
          },
          entity_types: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Types of entities to extract (e.g., person, organization, date, location)',
          },
        },
        required: ['text'],
      },
      output_schema: {
        type: 'object',
        properties: {
          entities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                value: { type: 'string' },
                context: { type: 'string' },
              },
              required: ['type', 'value'],
            },
            description: 'Extracted entities',
          },
        },
        required: ['entities'],
      },
      instructions:
        'Extract named entities from the input text. If entity_types are specified, focus on those types.',
    },
    {
      endpoint_name: 'extract-fields',
      display_name: 'Extract Fields',
      input_schema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text to extract data from',
          },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                description: { type: 'string' },
              },
              required: ['name'],
            },
            description: 'Fields to extract with their definitions',
          },
        },
        required: ['text', 'fields'],
      },
      output_schema: {
        type: 'object',
        properties: {
          extracted: {
            type: 'object',
            additionalProperties: true,
            description: 'Extracted field values',
          },
          missing: {
            type: 'array',
            items: { type: 'string' },
            description: 'Fields that could not be extracted',
          },
        },
        required: ['extracted'],
      },
      instructions:
        'Extract specific fields from the input text based on the provided field definitions.',
    },
  ],
};

/**
 * Content generator template
 */
export const contentGeneratorTemplate: ProjectTemplate = {
  id: 'content-generator',
  name: 'Content Generator',
  description: 'Generate content from structured input',
  category: 'Generation',
  endpoints: [
    {
      endpoint_name: 'generate-summary',
      display_name: 'Generate Summary',
      input_schema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text to summarize',
          },
          max_length: {
            type: 'integer',
            minimum: 50,
            maximum: 500,
            description: 'Maximum length of summary in words',
          },
          style: {
            type: 'string',
            enum: ['bullet_points', 'paragraph', 'key_takeaways'],
            description: 'Summary style',
          },
        },
        required: ['text'],
      },
      output_schema: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'The generated summary',
          },
          key_points: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key points from the text',
          },
          word_count: {
            type: 'integer',
            description: 'Word count of the summary',
          },
        },
        required: ['summary'],
      },
      instructions:
        'Generate a concise summary of the input text. Follow the specified style if provided.',
    },
    {
      endpoint_name: 'generate-response',
      display_name: 'Generate Response',
      input_schema: {
        type: 'object',
        properties: {
          context: {
            type: 'string',
            description: 'Context or background information',
          },
          message: {
            type: 'string',
            description: 'Message to respond to',
          },
          tone: {
            type: 'string',
            enum: ['professional', 'friendly', 'formal', 'casual'],
            description: 'Desired tone of the response',
          },
          max_length: {
            type: 'integer',
            description: 'Maximum length in words',
          },
        },
        required: ['message'],
      },
      output_schema: {
        type: 'object',
        properties: {
          response: {
            type: 'string',
            description: 'The generated response',
          },
          suggestions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Alternative response suggestions',
          },
        },
        required: ['response'],
      },
      instructions:
        'Generate a contextual response to the input message. Use the specified tone and stay within length limits.',
    },
  ],
};

/**
 * Localization template
 */
export const localizationTemplate: ProjectTemplate = {
  id: 'localization',
  name: 'Localization',
  description: 'Translate text to multiple languages',
  category: 'Translation',
  endpoints: [
    {
      endpoint_name: 'translate-batch',
      display_name: 'Batch Translate',
      input_schema: {
        type: 'object',
        properties: {
          texts: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of text strings to translate',
          },
          target_language_codes: {
            type: 'array',
            items: { type: 'string' },
            description:
              'List of target language codes (e.g., "es", "fr", "de", "zh", "ja")',
          },
          source_language_code: {
            type: 'string',
            description:
              'Source language code (optional, auto-detected if not provided)',
          },
          preserve_formatting: {
            type: 'boolean',
            description: 'Whether to preserve formatting like line breaks',
          },
        },
        required: ['texts', 'target_language_codes'],
      },
      output_schema: {
        type: 'object',
        properties: {
          translations: {
            type: 'array',
            items: {
              type: 'array',
              items: { type: 'string' },
              description: 'Translations of one text in all target languages',
            },
            description:
              'Array of arrays - for each input text, translations in each target language (in same order as target_language_codes)',
          },
          detected_source_language_code: {
            type: 'string',
            description: 'Detected source language code',
          },
        },
        required: ['translations'],
      },
      instructions:
        'Translate each text in the texts array to all specified target language codes. Return translations[i][j] as the translation of texts[i] into target_language_codes[j].',
    },
    {
      endpoint_name: 'translate-single',
      display_name: 'Single Translate',
      input_schema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Text to translate',
          },
          target_language_code: {
            type: 'string',
            description: 'Target language code (e.g., "es", "fr", "de")',
          },
          source_language_code: {
            type: 'string',
            description: 'Source language code (optional)',
          },
          context: {
            type: 'string',
            description: 'Additional context to improve translation accuracy',
          },
        },
        required: ['text', 'target_language_code'],
      },
      output_schema: {
        type: 'object',
        properties: {
          translation: {
            type: 'string',
            description: 'Translated text',
          },
          detected_source_language_code: {
            type: 'string',
            description: 'Detected source language code',
          },
          alternatives: {
            type: 'array',
            items: { type: 'string' },
            description: 'Alternative translations if applicable',
          },
        },
        required: ['translation'],
      },
      instructions:
        'Translate a single text to the specified target language code. Optionally provide context for better accuracy.',
    },
  ],
};

/**
 * Image recognition template (image → text)
 */
export const imageRecognitionTemplate: ProjectTemplate = {
  id: 'image-recognition',
  name: 'Image Recognition',
  description: 'Analyze and describe images using vision models',
  category: 'Vision',
  endpoints: [
    {
      endpoint_name: 'analyze-image',
      display_name: 'Analyze Image',
      input_schema: {
        type: 'object',
        properties: {
          image: {
            type: 'string',
            format: 'binary',
            contentMediaType: 'image/*',
            description: 'The image to analyze',
          },
          analysis_type: {
            type: 'string',
            enum: ['description', 'objects', 'text_extraction', 'detailed'],
            description: 'Type of analysis to perform',
          },
          language: {
            type: 'string',
            description: 'Language for the response (default: English)',
          },
        },
        required: ['image'],
      },
      output_schema: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Natural language description of the image',
          },
          objects: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                location: { type: 'string' },
              },
              required: ['name'],
            },
            description: 'Detected objects in the image',
          },
          extracted_text: {
            type: 'string',
            description: 'Text extracted from the image (OCR)',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Relevant tags for the image',
          },
        },
        required: ['description'],
      },
      instructions:
        'Analyze the provided image and return a detailed description. If analysis_type is specified, focus on that aspect. For "objects", list all detectable objects. For "text_extraction", extract any visible text. For "detailed", provide comprehensive analysis including colors, composition, and context.',
    },
    {
      endpoint_name: 'classify-image',
      display_name: 'Classify Image',
      input_schema: {
        type: 'object',
        properties: {
          image: {
            type: 'string',
            format: 'binary',
            contentMediaType: 'image/*',
            description: 'The image to classify',
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of possible categories',
          },
        },
        required: ['image', 'categories'],
      },
      output_schema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'The classified category',
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Confidence score (0-1)',
          },
          reasoning: {
            type: 'string',
            description: 'Brief explanation of the classification',
          },
        },
        required: ['category', 'confidence'],
      },
      instructions:
        'Classify the input image into one of the provided categories. Analyze the visual content and return the most appropriate category with a confidence score and reasoning.',
    },
  ],
};

/**
 * Image generation template (text → image)
 * Note: Requires image generation models (Imagen, DALL-E) not yet supported in V1
 */
export const imageGenerationTemplate: ProjectTemplate = {
  id: 'image-generation',
  name: 'Image Generation',
  description: 'Generate images from text descriptions (Coming Soon)',
  category: 'Generation',
  requiresV2: true,
  endpoints: [
    {
      endpoint_name: 'generate-image',
      display_name: 'Generate Image',
      input_schema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Detailed description of the image to generate',
          },
          style: {
            type: 'string',
            enum: [
              'realistic',
              'artistic',
              'cartoon',
              'sketch',
              'abstract',
              'minimalist',
            ],
            description: 'Visual style for the generated image',
          },
          aspect_ratio: {
            type: 'string',
            enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
            description: 'Aspect ratio of the generated image',
          },
          negative_prompt: {
            type: 'string',
            description: 'Elements to avoid in the generated image',
          },
        },
        required: ['prompt'],
      },
      output_schema: {
        type: 'object',
        properties: {
          image: {
            type: 'string',
            format: 'binary',
            contentMediaType: 'image/*',
            description: 'The generated image',
          },
          revised_prompt: {
            type: 'string',
            description: 'The prompt as interpreted by the model',
          },
        },
        required: ['image'],
      },
      instructions:
        'Generate an image based on the provided text description. Apply the specified style if provided. Avoid elements mentioned in negative_prompt. Ensure the generated image matches the requested aspect ratio.',
    },
  ],
};

/**
 * Image processing template (image → image)
 * Note: Requires image editing models (DALL-E edit, Stable Diffusion) not yet supported in V1
 */
export const imageProcessingTemplate: ProjectTemplate = {
  id: 'image-processing',
  name: 'Image Processing',
  description: 'Transform and edit images using AI (Coming Soon)',
  category: 'Processing',
  requiresV2: true,
  endpoints: [
    {
      endpoint_name: 'edit-image',
      display_name: 'Edit Image',
      input_schema: {
        type: 'object',
        properties: {
          image: {
            type: 'string',
            format: 'binary',
            contentMediaType: 'image/*',
            description: 'The source image to edit',
          },
          edit_instruction: {
            type: 'string',
            description:
              'Natural language instruction for how to edit the image',
          },
          mask: {
            type: 'string',
            format: 'binary',
            contentMediaType: 'image/*',
            description:
              'Optional mask indicating area to edit (white = edit, black = preserve)',
          },
        },
        required: ['image', 'edit_instruction'],
      },
      output_schema: {
        type: 'object',
        properties: {
          image: {
            type: 'string',
            format: 'binary',
            contentMediaType: 'image/*',
            description: 'The edited image',
          },
          changes_made: {
            type: 'string',
            description: 'Description of changes applied to the image',
          },
        },
        required: ['image'],
      },
      instructions:
        'Apply the requested edit to the provided image. If a mask is provided, only modify the white areas of the mask. Preserve the original style and quality of the image where possible.',
    },
    {
      endpoint_name: 'transform-style',
      display_name: 'Transform Style',
      input_schema: {
        type: 'object',
        properties: {
          image: {
            type: 'string',
            format: 'binary',
            contentMediaType: 'image/*',
            description: 'The source image to transform',
          },
          target_style: {
            type: 'string',
            description:
              'Description of the target style (e.g., "oil painting", "anime", "watercolor")',
          },
          preserve_content: {
            type: 'boolean',
            description: 'Whether to preserve the original content/composition',
          },
        },
        required: ['image', 'target_style'],
      },
      output_schema: {
        type: 'object',
        properties: {
          image: {
            type: 'string',
            format: 'binary',
            contentMediaType: 'image/*',
            description: 'The style-transformed image',
          },
          original_style: {
            type: 'string',
            description: 'Description of the original image style',
          },
        },
        required: ['image'],
      },
      instructions:
        'Transform the visual style of the image to match the target_style description. If preserve_content is true, maintain the original composition and subjects while changing only the artistic style.',
    },
  ],
};

/**
 * Audio transcription template (audio → text)
 * Works with Whisper models via Groq provider
 */
export const audioTranscriptionTemplate: ProjectTemplate = {
  id: 'audio-transcription',
  name: 'Audio Transcription',
  description: 'Transcribe audio to text with optional structured extraction',
  category: 'Transcription',
  endpoints: [
    {
      endpoint_name: 'transcribe',
      display_name: 'Transcribe Audio',
      input_schema: {
        type: 'object',
        properties: {
          audio: {
            type: 'string',
            format: 'binary',
            contentMediaType: 'audio/*',
            description: 'The audio file to transcribe (mp3, wav, ogg, flac)',
          },
        },
        required: ['audio'],
      },
      output_schema: {
        type: 'object',
        properties: {
          transcription: {
            type: 'string',
            description: 'The transcribed text from the audio',
          },
        },
        required: ['transcription'],
      },
      instructions:
        'Transcribe the audio content to text. Return the full transcription preserving natural speech patterns.',
    },
    {
      endpoint_name: 'transcribe-meeting',
      display_name: 'Transcribe Meeting',
      input_schema: {
        type: 'object',
        properties: {
          audio: {
            type: 'string',
            format: 'binary',
            contentMediaType: 'audio/*',
            description: 'The meeting audio to transcribe',
          },
          extract_action_items: {
            type: 'boolean',
            description: 'Whether to extract action items from the meeting',
          },
        },
        required: ['audio'],
      },
      output_schema: {
        type: 'object',
        properties: {
          transcription: {
            type: 'string',
            description: 'Full transcription of the meeting',
          },
          summary: {
            type: 'string',
            description: 'Brief summary of the meeting',
          },
          key_points: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key points discussed in the meeting',
          },
          action_items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                task: { type: 'string' },
                assignee: { type: 'string' },
                deadline: { type: 'string' },
              },
              required: ['task'],
            },
            description: 'Action items extracted from the meeting',
          },
          participants: {
            type: 'array',
            items: { type: 'string' },
            description: 'Detected participants/speakers',
          },
        },
        required: ['transcription', 'summary'],
      },
      instructions:
        'Transcribe the meeting audio and extract structured information. Identify key discussion points, decisions made, and action items if requested. Try to identify different speakers when possible.',
    },
  ],
};

/**
 * All available templates
 */
export const ALL_TEMPLATES: ProjectTemplate[] = [
  textClassifierTemplate,
  sentimentAnalyzerTemplate,
  dataExtractorTemplate,
  contentGeneratorTemplate,
  localizationTemplate,
  imageRecognitionTemplate,
  audioTranscriptionTemplate,
  imageGenerationTemplate,
  imageProcessingTemplate,
];

/**
 * Apply a template to create project and endpoint requests
 * @param template - The template to apply
 * @param projectName - The project slug/name (lowercase, hyphen-separated)
 * @param llmKeyId - The LLM key ID to use for endpoints
 * @param displayName - Optional custom display name (defaults to template.name)
 */
export function applyTemplate(
  template: ProjectTemplate,
  projectName: string,
  llmKeyId: string,
  displayName?: string
): {
  project: ProjectCreateRequest;
  endpoints: EndpointCreateRequest[];
} {
  const project: ProjectCreateRequest = {
    project_name: projectName,
    display_name: displayName?.trim() || template.name,
    description: template.description,
  };

  const endpoints: EndpointCreateRequest[] = template.endpoints.map(ep => ({
    endpoint_name: ep.endpoint_name,
    display_name: ep.display_name,
    http_method: 'POST',
    llm_key_id: llmKeyId,
    model: null,
    input_schema: ep.input_schema,
    output_schema: ep.output_schema,
    instructions: ep.instructions,
    context: ep.context,
  }));

  return { project, endpoints };
}
