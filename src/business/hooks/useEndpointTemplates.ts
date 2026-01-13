/**
 * Endpoint Templates Hook
 * Access and apply endpoint templates within an existing project
 */

import { useCallback, useMemo } from 'react';
import type { EndpointCreateRequest } from '@sudobility/shapeshyft_types';
import {
  ALL_TEMPLATES,
  type EndpointTemplate,
  type ProjectTemplate,
} from '../templates/endpoint-templates';

/**
 * Endpoint template with category info
 */
export interface EndpointTemplateWithCategory extends EndpointTemplate {
  category: string;
  projectTemplateId: string;
  projectTemplateName: string;
}

/**
 * Return type for useEndpointTemplates
 */
export interface UseEndpointTemplatesReturn {
  /** All endpoint templates with category info */
  endpointTemplates: EndpointTemplateWithCategory[];
  /** Get templates by category */
  getByCategory: (category: string) => EndpointTemplateWithCategory[];
  /** Get all unique categories */
  getCategories: () => string[];
  /** Apply a template to create an endpoint request */
  applyEndpointTemplate: (
    template: EndpointTemplateWithCategory,
    llmKeyId: string
  ) => EndpointCreateRequest;
}

/**
 * Hook for accessing and applying endpoint templates
 */
export const useEndpointTemplates = (): UseEndpointTemplatesReturn => {
  /**
   * Flatten all endpoint templates from project templates
   */
  const endpointTemplates = useMemo((): EndpointTemplateWithCategory[] => {
    const templates: EndpointTemplateWithCategory[] = [];

    ALL_TEMPLATES.forEach((projectTemplate: ProjectTemplate) => {
      projectTemplate.endpoints.forEach((endpoint: EndpointTemplate) => {
        templates.push({
          ...endpoint,
          category: projectTemplate.category,
          projectTemplateId: projectTemplate.id,
          projectTemplateName: projectTemplate.name,
        });
      });
    });

    return templates;
  }, []);

  /**
   * Get templates by category
   */
  const getByCategory = useCallback(
    (category: string): EndpointTemplateWithCategory[] => {
      return endpointTemplates.filter(t => t.category === category);
    },
    [endpointTemplates]
  );

  /**
   * Get all unique categories
   */
  const getCategories = useCallback((): string[] => {
    const categories = new Set(endpointTemplates.map(t => t.category));
    return Array.from(categories).sort();
  }, [endpointTemplates]);

  /**
   * Apply an endpoint template to create an endpoint request
   */
  const applyEndpointTemplate = useCallback(
    (
      template: EndpointTemplateWithCategory,
      llmKeyId: string
    ): EndpointCreateRequest => {
      return {
        endpoint_name: template.endpoint_name,
        display_name: template.display_name,
        http_method: 'POST',
        llm_key_id: llmKeyId,
        model: undefined,
        input_schema: template.input_schema,
        output_schema: template.output_schema,
        instructions: template.instructions,
        context: template.context,
      };
    },
    []
  );

  return useMemo(
    () => ({
      endpointTemplates,
      getByCategory,
      getCategories,
      applyEndpointTemplate,
    }),
    [endpointTemplates, getByCategory, getCategories, applyEndpointTemplate]
  );
};
