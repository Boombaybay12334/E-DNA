import type { Report, SampleType } from '../types';
import pipelineData from './pipeline_report_output.json';

export function buildMockReport(_type: SampleType = 'water'): Report {
  return pipelineData as Report;
}
