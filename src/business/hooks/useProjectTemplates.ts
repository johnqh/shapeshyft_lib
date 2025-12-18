/**
 * Project Templates Hook
 * Access and apply pre-built project templates
 */

import { useCallback, useMemo } from 'react';
import type {
  EndpointCreateRequest,
  ProjectCreateRequest,
} from '@sudobility/shapeshyft_types';
import {
  ALL_TEMPLATES,
  applyTemplate,
  type ProjectTemplate,
} from '../templates/endpoint-templates';

/**
 * Return type for useProjectTemplates
 */
export interface UseProjectTemplatesReturn {
  templates: ProjectTemplate[];
  getTemplate: (id: string) => ProjectTemplate | undefined;
  getTemplatesByCategory: (category: string) => ProjectTemplate[];
  getCategories: () => string[];
  applyTemplate: (
    templateId: string,
    projectName: string,
    llmKeyId: string
  ) =>
    | {
        project: ProjectCreateRequest;
        endpoints: EndpointCreateRequest[];
      }
    | undefined;
}

/**
 * Hook for accessing and applying project templates
 */
export const useProjectTemplates = (): UseProjectTemplatesReturn => {
  /**
   * Get a template by ID
   */
  const getTemplate = useCallback((id: string): ProjectTemplate | undefined => {
    return ALL_TEMPLATES.find(t => t.id === id);
  }, []);

  /**
   * Get templates by category
   */
  const getTemplatesByCategory = useCallback(
    (category: string): ProjectTemplate[] => {
      return ALL_TEMPLATES.filter(t => t.category === category);
    },
    []
  );

  /**
   * Get all unique categories
   */
  const getCategories = useCallback((): string[] => {
    const categories = new Set(ALL_TEMPLATES.map(t => t.category));
    return Array.from(categories).sort();
  }, []);

  /**
   * Apply a template to create project and endpoint requests
   */
  const apply = useCallback(
    (
      templateId: string,
      projectName: string,
      llmKeyId: string
    ):
      | {
          project: ProjectCreateRequest;
          endpoints: EndpointCreateRequest[];
        }
      | undefined => {
      const template = getTemplate(templateId);
      if (!template) {
        return undefined;
      }
      return applyTemplate(template, projectName, llmKeyId);
    },
    [getTemplate]
  );

  return useMemo(
    () => ({
      templates: ALL_TEMPLATES,
      getTemplate,
      getTemplatesByCategory,
      getCategories,
      applyTemplate: apply,
    }),
    [getTemplate, getTemplatesByCategory, getCategories, apply]
  );
};
