/**
 * Pre-built endpoint templates for common use cases
 */

import type {
  EndpointCreateRequest,
  EndpointType,
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
}

/**
 * Endpoint template definition
 */
export interface EndpointTemplate {
  endpoint_name: string;
  display_name: string;
  endpoint_type: EndpointType;
  input_schema: JsonSchema;
  output_schema: JsonSchema;
  description: string;
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
      endpoint_type: 'text_in_structured_out',
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
      description:
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
      endpoint_type: 'text_in_structured_out',
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
      description:
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
      endpoint_type: 'text_in_structured_out',
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
      description:
        'Extract named entities from the input text. If entity_types are specified, focus on those types.',
    },
    {
      endpoint_name: 'extract-fields',
      display_name: 'Extract Fields',
      endpoint_type: 'structured_in_structured_out',
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
      description:
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
      endpoint_type: 'text_in_structured_out',
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
      description:
        'Generate a concise summary of the input text. Follow the specified style if provided.',
    },
    {
      endpoint_name: 'generate-response',
      display_name: 'Generate Response',
      endpoint_type: 'structured_in_structured_out',
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
      description:
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
      endpoint_type: 'structured_in_structured_out',
      input_schema: {
        type: 'object',
        properties: {
          texts: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of text strings to translate',
          },
          target_languages: {
            type: 'array',
            items: { type: 'string' },
            description:
              'List of target language codes (e.g., "es", "fr", "de", "zh", "ja")',
          },
          source_language: {
            type: 'string',
            description:
              'Source language code (optional, auto-detected if not provided)',
          },
          preserve_formatting: {
            type: 'boolean',
            description: 'Whether to preserve formatting like line breaks',
          },
        },
        required: ['texts', 'target_languages'],
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
              'Array of arrays - for each input text, translations in each target language (in same order as target_languages)',
          },
          detected_source_language: {
            type: 'string',
            description: 'Detected source language code',
          },
        },
        required: ['translations'],
      },
      description:
        'Translate each text in the texts array to all specified target languages. Return translations[i][j] as the translation of texts[i] into target_languages[j].',
    },
    {
      endpoint_name: 'translate-single',
      display_name: 'Single Translate',
      endpoint_type: 'structured_in_structured_out',
      input_schema: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Text to translate',
          },
          target_language: {
            type: 'string',
            description: 'Target language code (e.g., "es", "fr", "de")',
          },
          source_language: {
            type: 'string',
            description: 'Source language code (optional)',
          },
          context: {
            type: 'string',
            description: 'Additional context to improve translation accuracy',
          },
        },
        required: ['text', 'target_language'],
      },
      output_schema: {
        type: 'object',
        properties: {
          translation: {
            type: 'string',
            description: 'Translated text',
          },
          detected_source_language: {
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
      description:
        'Translate a single text to the specified target language. Optionally provide context for better accuracy.',
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
];

/**
 * Apply a template to create project and endpoint requests
 */
export function applyTemplate(
  template: ProjectTemplate,
  projectName: string,
  llmKeyId: string
): {
  project: ProjectCreateRequest;
  endpoints: EndpointCreateRequest[];
} {
  const project: ProjectCreateRequest = {
    project_name: projectName,
    display_name: template.name,
    description: template.description,
  };

  const endpoints: EndpointCreateRequest[] = template.endpoints.map(ep => ({
    endpoint_name: ep.endpoint_name,
    display_name: ep.display_name,
    http_method: 'POST',
    endpoint_type: ep.endpoint_type,
    llm_key_id: llmKeyId,
    input_schema: ep.input_schema,
    output_schema: ep.output_schema,
    description: ep.description,
    context: ep.context,
  }));

  return { project, endpoints };
}
