import type { FC } from 'react';
import type { ClassificationStatus } from '../../types/contract';
import {
  IconCheckCircle,
  IconAlertCircle,
  IconHelpCircle,
  IconXCircle,
} from './icons';

interface StatusBadgeProps {
  status: ClassificationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  switch (status) {
    case 'assigned_full':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}
          title="Fully assigned down to genus (deepest evaluated rank)"
        >
          {showIcon && <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
          <span>Fully assigned</span>
        </span>
      );

    case 'assigned_partial':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}
          title="Supported down to intermediate rank. Deeper taxonomic ranks did not meet the operating confidence threshold \u03c4."
        >
          {showIcon && <IconAlertCircle className="w-3.5 h-3.5 text-amber-600" />}
          <span>Partially assigned</span>
        </span>
      );

    case 'unassigned':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}
          title="Confidence at root (domain) is below threshold tau. No reliable assignment."
        >
          {showIcon && <IconHelpCircle className="w-3.5 h-3.5 text-slate-500" />}
          <span>Unassigned</span>
        </span>
      );

    case 'invalid_input':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-rose-50 text-rose-800 border border-rose-200 ${sizeClasses}`}
          title="Sequence rejected prior to classification (e.g. length < 200 bp or non-ACGT characters)"
        >
          {showIcon && <IconXCircle className="w-3.5 h-3.5 text-rose-600" />}
          <span>Invalid input</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-600 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
};
