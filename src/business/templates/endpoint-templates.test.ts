import { describe, it, expect } from 'vitest';
import {
  textClassifierTemplate,
  sentimentAnalyzerTemplate,
  dataExtractorTemplate,
  contentGeneratorTemplate,
  localizationTemplate,
  imageRecognitionTemplate,
  audioTranscriptionTemplate,
  imageGenerationTemplate,
  imageProcessingTemplate,
  ALL_TEMPLATES,
  applyTemplate,
  type ProjectTemplate,
} from './endpoint-templates';

describe('endpoint-templates', () => {
  describe('template definitions', () => {
    it('should export all 9 templates', () => {
      expect(ALL_TEMPLATES).toHaveLength(9);
    });

    it('should have unique template ids', () => {
      const ids = ALL_TEMPLATES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    describe('textClassifierTemplate', () => {
      it('should have correct structure', () => {
        expect(textClassifierTemplate.id).toBe('text-classifier');
        expect(textClassifierTemplate.name).toBe('Text Classifier');
        expect(textClassifierTemplate.category).toBe('Classification');
        expect(textClassifierTemplate.endpoints).toHaveLength(1);
      });

      it('should have classify endpoint with required schemas', () => {
        const endpoint = textClassifierTemplate.endpoints[0];
        expect(endpoint.endpoint_name).toBe('classify');
        expect(endpoint.input_schema.properties).toHaveProperty('text');
        expect(endpoint.input_schema.properties).toHaveProperty('categories');
        expect(endpoint.output_schema.properties).toHaveProperty('category');
        expect(endpoint.output_schema.properties).toHaveProperty('confidence');
      });
    });

    describe('sentimentAnalyzerTemplate', () => {
      it('should have correct structure', () => {
        expect(sentimentAnalyzerTemplate.id).toBe('sentiment-analyzer');
        expect(sentimentAnalyzerTemplate.name).toBe('Sentiment Analyzer');
        expect(sentimentAnalyzerTemplate.category).toBe('Analysis');
        expect(sentimentAnalyzerTemplate.endpoints).toHaveLength(1);
      });

      it('should have analyze endpoint with sentiment output', () => {
        const endpoint = sentimentAnalyzerTemplate.endpoints[0];
        expect(endpoint.endpoint_name).toBe('analyze');
        expect(endpoint.output_schema.properties).toHaveProperty('sentiment');
        expect(endpoint.output_schema.properties).toHaveProperty('score');
        expect(endpoint.output_schema.properties?.sentiment?.enum).toContain(
          'positive'
        );
        expect(endpoint.output_schema.properties?.sentiment?.enum).toContain(
          'negative'
        );
      });
    });

    describe('dataExtractorTemplate', () => {
      it('should have correct structure', () => {
        expect(dataExtractorTemplate.id).toBe('data-extractor');
        expect(dataExtractorTemplate.name).toBe('Data Extractor');
        expect(dataExtractorTemplate.category).toBe('Extraction');
        expect(dataExtractorTemplate.endpoints).toHaveLength(2);
      });

      it('should have entity and field extraction endpoints', () => {
        const endpointNames = dataExtractorTemplate.endpoints.map(
          e => e.endpoint_name
        );
        expect(endpointNames).toContain('extract-entities');
        expect(endpointNames).toContain('extract-fields');
      });
    });

    describe('contentGeneratorTemplate', () => {
      it('should have correct structure', () => {
        expect(contentGeneratorTemplate.id).toBe('content-generator');
        expect(contentGeneratorTemplate.name).toBe('Content Generator');
        expect(contentGeneratorTemplate.category).toBe('Generation');
        expect(contentGeneratorTemplate.endpoints).toHaveLength(2);
      });

      it('should have summary and response generation endpoints', () => {
        const endpointNames = contentGeneratorTemplate.endpoints.map(
          e => e.endpoint_name
        );
        expect(endpointNames).toContain('generate-summary');
        expect(endpointNames).toContain('generate-response');
      });
    });

    describe('localizationTemplate', () => {
      it('should have correct structure', () => {
        expect(localizationTemplate.id).toBe('localization');
        expect(localizationTemplate.name).toBe('Localization');
        expect(localizationTemplate.category).toBe('Translation');
        expect(localizationTemplate.endpoints).toHaveLength(2);
      });

      it('should have batch and single translation endpoints', () => {
        const endpointNames = localizationTemplate.endpoints.map(
          e => e.endpoint_name
        );
        expect(endpointNames).toContain('translate-batch');
        expect(endpointNames).toContain('translate-single');
      });
    });

    describe('imageRecognitionTemplate', () => {
      it('should have correct structure', () => {
        expect(imageRecognitionTemplate.id).toBe('image-recognition');
        expect(imageRecognitionTemplate.name).toBe('Image Recognition');
        expect(imageRecognitionTemplate.category).toBe('Vision');
        expect(imageRecognitionTemplate.endpoints).toHaveLength(2);
      });

      it('should have image analysis endpoints with media input', () => {
        const endpointNames = imageRecognitionTemplate.endpoints.map(
          e => e.endpoint_name
        );
        expect(endpointNames).toContain('analyze-image');
        expect(endpointNames).toContain('classify-image');

        // Verify image input field has correct media type format
        const analyzeEndpoint = imageRecognitionTemplate.endpoints[0];
        expect(analyzeEndpoint.input_schema.properties?.image?.format).toBe(
          'binary'
        );
        expect(
          analyzeEndpoint.input_schema.properties?.image?.contentMediaType
        ).toBe('image/*');
      });
    });

    describe('audioTranscriptionTemplate', () => {
      it('should have correct structure', () => {
        expect(audioTranscriptionTemplate.id).toBe('audio-transcription');
        expect(audioTranscriptionTemplate.name).toBe('Audio Transcription');
        expect(audioTranscriptionTemplate.category).toBe('Transcription');
        expect(audioTranscriptionTemplate.endpoints).toHaveLength(2);
      });

      it('should have transcription endpoints with audio input', () => {
        const endpointNames = audioTranscriptionTemplate.endpoints.map(
          e => e.endpoint_name
        );
        expect(endpointNames).toContain('transcribe');
        expect(endpointNames).toContain('transcribe-meeting');

        // Verify audio input field has correct media type format
        const transcribeEndpoint = audioTranscriptionTemplate.endpoints[0];
        expect(transcribeEndpoint.input_schema.properties?.audio?.format).toBe(
          'binary'
        );
        expect(
          transcribeEndpoint.input_schema.properties?.audio?.contentMediaType
        ).toBe('audio/*');
      });

      it('should have structured output for meeting transcription', () => {
        const meetingEndpoint = audioTranscriptionTemplate.endpoints[1];
        expect(meetingEndpoint.output_schema.properties).toHaveProperty(
          'transcription'
        );
        expect(meetingEndpoint.output_schema.properties).toHaveProperty(
          'summary'
        );
        expect(meetingEndpoint.output_schema.properties).toHaveProperty(
          'action_items'
        );
      });
    });

    describe('imageGenerationTemplate', () => {
      it('should have correct structure', () => {
        expect(imageGenerationTemplate.id).toBe('image-generation');
        expect(imageGenerationTemplate.name).toBe('Image Generation');
        expect(imageGenerationTemplate.category).toBe('Generation');
        expect(imageGenerationTemplate.endpoints).toHaveLength(1);
        expect(imageGenerationTemplate.requiresV2).toBe(true);
      });

      it('should have generate endpoint with media output', () => {
        const endpoint = imageGenerationTemplate.endpoints[0];
        expect(endpoint.endpoint_name).toBe('generate-image');
        expect(endpoint.input_schema.properties).toHaveProperty('prompt');
        expect(endpoint.output_schema.properties?.image?.format).toBe('binary');
        expect(
          endpoint.output_schema.properties?.image?.contentMediaType
        ).toBe('image/*');
      });
    });

    describe('imageProcessingTemplate', () => {
      it('should have correct structure', () => {
        expect(imageProcessingTemplate.id).toBe('image-processing');
        expect(imageProcessingTemplate.name).toBe('Image Processing');
        expect(imageProcessingTemplate.category).toBe('Processing');
        expect(imageProcessingTemplate.endpoints).toHaveLength(2);
      });

      it('should have edit and transform endpoints with media input/output', () => {
        const endpointNames = imageProcessingTemplate.endpoints.map(
          e => e.endpoint_name
        );
        expect(endpointNames).toContain('edit-image');
        expect(endpointNames).toContain('transform-style');

        // Verify both input and output are images
        const editEndpoint = imageProcessingTemplate.endpoints[0];
        expect(editEndpoint.input_schema.properties?.image?.format).toBe(
          'binary'
        );
        expect(editEndpoint.output_schema.properties?.image?.format).toBe(
          'binary'
        );
      });
    });
  });

  describe('applyTemplate', () => {
    it('should create project with template name and description', () => {
      const result = applyTemplate(
        textClassifierTemplate,
        'my-classifier',
        'key-123'
      );

      expect(result.project.project_name).toBe('my-classifier');
      expect(result.project.display_name).toBe('Text Classifier');
      expect(result.project.description).toBe(
        'Classify text into predefined categories'
      );
    });

    it('should create endpoints with correct properties', () => {
      const result = applyTemplate(
        textClassifierTemplate,
        'my-classifier',
        'key-123'
      );

      expect(result.endpoints).toHaveLength(1);
      expect(result.endpoints[0]).toEqual(
        expect.objectContaining({
          endpoint_name: 'classify',
          display_name: 'Classify Text',
          http_method: 'POST',
          llm_key_id: 'key-123',
        })
      );
    });

    it('should preserve input and output schemas', () => {
      const result = applyTemplate(
        sentimentAnalyzerTemplate,
        'sentiment',
        'key-456'
      );

      const endpoint = result.endpoints[0];
      expect(endpoint.input_schema).toEqual(
        sentimentAnalyzerTemplate.endpoints[0].input_schema
      );
      expect(endpoint.output_schema).toEqual(
        sentimentAnalyzerTemplate.endpoints[0].output_schema
      );
    });

    it('should set instructions from template', () => {
      const result = applyTemplate(
        dataExtractorTemplate,
        'extractor',
        'key-789'
      );

      result.endpoints.forEach((endpoint, index) => {
        expect(endpoint.instructions).toBe(
          dataExtractorTemplate.endpoints[index].instructions
        );
      });
    });

    it('should work with templates having multiple endpoints', () => {
      const result = applyTemplate(
        dataExtractorTemplate,
        'extractor',
        'key-abc'
      );

      expect(result.endpoints).toHaveLength(2);
      expect(result.endpoints[0].endpoint_name).toBe('extract-entities');
      expect(result.endpoints[1].endpoint_name).toBe('extract-fields');
    });

    it('should apply same llm_key_id to all endpoints', () => {
      const result = applyTemplate(
        contentGeneratorTemplate,
        'generator',
        'shared-key'
      );

      result.endpoints.forEach(endpoint => {
        expect(endpoint.llm_key_id).toBe('shared-key');
      });
    });
  });

  describe('template validation', () => {
    it('all templates should have required fields', () => {
      ALL_TEMPLATES.forEach((template: ProjectTemplate) => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.endpoints.length).toBeGreaterThan(0);

        template.endpoints.forEach(endpoint => {
          expect(endpoint.endpoint_name).toBeDefined();
          expect(endpoint.display_name).toBeDefined();
          expect(endpoint.input_schema).toBeDefined();
          expect(endpoint.output_schema).toBeDefined();
          expect(endpoint.instructions).toBeDefined();
        });
      });
    });

    it('all endpoint names should be URL-safe', () => {
      const urlSafeRegex = /^[a-z0-9-]+$/;

      ALL_TEMPLATES.forEach(template => {
        template.endpoints.forEach(endpoint => {
          expect(endpoint.endpoint_name).toMatch(urlSafeRegex);
        });
      });
    });
  });
});
